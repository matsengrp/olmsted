#!/usr/bin/env python3
"""
Delete files from an S3 bucket. Two source modes:

1. Bucket scan: list objects matching `-p PREFIX` and `-s SEARCH`
   (substring; pass `-r` to use regex), then delete matches.
2. From-file: read a newline-delimited list of exact keys from
   `-f FILE` and delete those specific paths.

Mirrors aws_download.py conventions for credentials and anonymous access.

Safety:
- --dry-run is the DEFAULT. Pass --confirm to actually delete.
- Always prints the file count and (when there are many files) shows
  the first 10 and last 5 keys for sanity-checking before deletion.

Examples:
  # Preview what would be deleted under prefix data/ (dry-run, default)
  %(prog)s -b www.olmstedviz.org -p data/

  # Actually delete (after reviewing the dry-run output)
  %(prog)s -b www.olmstedviz.org -p data/ --confirm

  # Delete a specific list of keys from a file (one path per line)
  %(prog)s -b www.olmstedviz.org -f /tmp/orphans.txt --confirm
"""

import argparse
import re
import sys
from pathlib import Path

import boto3
import yaml


def load_credentials(creds_filename):
    """Load AWS credentials from YAML file."""
    with open(creds_filename) as handle:
        return yaml.load(handle, Loader=yaml.SafeLoader)


def create_s3_client(credentials=None):
    """Create S3 client with or without credentials."""
    if credentials:
        return boto3.client("s3", **credentials)
    from botocore import UNSIGNED
    from botocore.config import Config

    return boto3.client("s3", config=Config(signature_version=UNSIGNED))


def format_file_size(size):
    """Format file size in human-readable form."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


def list_objects(client, bucket_name, prefix="", search_term=None, use_regex=False):
    """List objects in `bucket_name` under `prefix`, optionally filtered.

    Returns a list of {Key, Size} dicts.
    """
    pattern = None
    if search_term and use_regex:
        try:
            pattern = re.compile(search_term, re.IGNORECASE)
        except re.error as e:
            print(f"Invalid regex pattern: {e}", file=sys.stderr)
            sys.exit(2)

    paginator = client.get_paginator("list_objects_v2")
    matched = []
    skipped = 0
    for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/"):
                continue
            if search_term:
                if use_regex:
                    if not pattern.search(key):
                        skipped += 1
                        continue
                elif search_term.lower() not in key.lower():
                    skipped += 1
                    continue
            matched.append(obj)
    return matched, skipped


def read_keys_from_file(path):
    """Read newline-delimited S3 keys from a file. Strips whitespace,
    skips blank lines and #-prefixed comment lines."""
    keys = []
    with open(path) as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            keys.append(stripped)
    return keys


def print_summary(matched, search_term, skipped):
    """Print a count + size summary, plus head/tail key samples."""
    total_size = sum(obj["Size"] for obj in matched)
    if search_term:
        print(f"Matched {len(matched)} files (skipped {skipped} non-matching)")
    else:
        print(f"Found {len(matched)} files")
    print(f"Total size: {format_file_size(total_size)}\n")

    if not matched:
        return

    head = 10
    tail = 5
    if len(matched) <= head + tail:
        for obj in matched:
            print(f"  {obj['Key']} ({format_file_size(obj['Size'])})")
    else:
        for obj in matched[:head]:
            print(f"  {obj['Key']} ({format_file_size(obj['Size'])})")
        print(f"  … {len(matched) - head - tail} more …")
        for obj in matched[-tail:]:
            print(f"  {obj['Key']} ({format_file_size(obj['Size'])})")
    print()


def print_keys_summary(keys, source_path):
    """Print count + head/tail samples for a from-file key list.
    Distinct from print_summary because we don't have per-object sizes."""
    print(f"Loaded {len(keys)} keys from {source_path}\n")
    if not keys:
        return
    head = 10
    tail = 5
    if len(keys) <= head + tail:
        for key in keys:
            print(f"  {key}")
    else:
        for key in keys[:head]:
            print(f"  {key}")
        print(f"  … {len(keys) - head - tail} more …")
        for key in keys[-tail:]:
            print(f"  {key}")
    print()


def delete_batch(client, bucket_name, keys):
    """Delete up to 1000 keys in a single DeleteObjects call (the S3 batch limit)."""
    response = client.delete_objects(
        Bucket=bucket_name,
        Delete={"Objects": [{"Key": k} for k in keys], "Quiet": False},
    )
    deleted = len(response.get("Deleted", []))
    errors = response.get("Errors", [])
    return deleted, errors


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("-b", "--bucket", required=True, help="S3 bucket name")
    parser.add_argument("-p", "--prefix", default="", help="Only consider keys with this prefix")
    parser.add_argument("-s", "--search", help="Filter keys by substring (case-insensitive)")
    parser.add_argument("-r", "--regex", action="store_true", help="Treat --search as a regex")
    parser.add_argument(
        "-f",
        "--from-file",
        help=(
            "Read newline-delimited keys from FILE and delete those exact "
            "paths. Mutually exclusive with --prefix/--search; blank lines "
            "and #-prefixed comments are ignored."
        ),
    )
    parser.add_argument("-c", "--creds", help="Path to AWS credentials YAML file")
    parser.add_argument("--anonymous", action="store_true", help="Access public bucket without credentials")
    parser.add_argument("--list-only", action="store_true", help="Only list matching files; do not delete")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete. WITHOUT THIS FLAG, this script only previews (dry-run is the default).",
    )

    args = parser.parse_args()

    if args.from_file and (args.prefix or args.search):
        parser.error("--from-file is mutually exclusive with --prefix and --search")

    if args.creds:
        print(f"Loading credentials from: {args.creds}")
        client = create_s3_client(load_credentials(args.creds))
    elif args.anonymous:
        print("Using anonymous access (public bucket)")
        client = create_s3_client()
    else:
        print("Using default AWS credentials")
        client = boto3.client("s3")

    print(f"\nBucket: {args.bucket}")

    if args.from_file:
        keys = read_keys_from_file(args.from_file)
        print()
        print_keys_summary(keys, args.from_file)
    else:
        if args.prefix:
            print(f"Prefix: '{args.prefix}'")
        if args.search:
            kind = "regex" if args.regex else "substring"
            print(f"Filter ({kind}): '{args.search}'")

        matched, _skipped = list_objects(client, args.bucket, args.prefix, args.search, args.regex)
        print()
        print_summary(matched, args.search, _skipped)
        keys = [obj["Key"] for obj in matched]

    if args.list_only:
        print("(--list-only — exiting without deleting)")
        return

    if not args.confirm:
        print("DRY RUN — pass --confirm to actually delete these files.")
        return

    if not keys:
        print("Nothing to delete.")
        return

    print(f"=== Deleting {len(keys)} files from {args.bucket} ===")
    BATCH = 1000
    total_deleted = 0
    all_errors = []
    for i in range(0, len(keys), BATCH):
        batch = keys[i : i + BATCH]
        deleted, errors = delete_batch(client, args.bucket, batch)
        total_deleted += deleted
        all_errors.extend(errors)
        print(f"  [{min(i + BATCH, len(keys))}/{len(keys)}] {total_deleted} deleted, {len(all_errors)} errors")

    print(f"\nDeleted: {total_deleted}")
    if all_errors:
        print(f"\nErrors ({len(all_errors)}):")
        for err in all_errors[:10]:
            print(f"  {err.get('Key')}: {err.get('Message')}")
        if len(all_errors) > 10:
            print(f"  … and {len(all_errors) - 10} more")
        sys.exit(1)


if __name__ == "__main__":
    main()
