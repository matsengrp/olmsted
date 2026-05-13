#!/usr/bin/env python3
"""
Delete files from an S3 bucket with optional prefix and search filtering.

Mirrors aws_download.py conventions:
- -b/--bucket, -p/--prefix, -s/--search, -r/--regex, -c/--creds
- Anonymous-access support for public buckets
- --list-only to preview without deleting

Safety:
- --dry-run is the DEFAULT. Pass --confirm to actually delete.
- Always prints the file count + total size and (when there are many
  files) shows the first 10 and last 5 keys for sanity-checking before
  deletion happens.

Examples:
  # Preview what would be deleted under prefix data/ (dry-run, default)
  %(prog)s -b www.olmstedviz.org -p data/

  # Actually delete (after reviewing the dry-run output)
  %(prog)s -b www.olmstedviz.org -p data/ --confirm
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


def delete_batch(client, bucket_name, keys):
    """Delete up to 1000 keys in a single DeleteObjects call."""
    response = client.delete_objects(
        Bucket=bucket_name,
        Delete={"Objects": [{"Key": k} for k in keys], "Quiet": False},
    )
    deleted = len(response.get("Deleted", []))
    errors = response.get("Errors", [])
    return deleted, errors


def delete_objects(client, bucket_name, matched):
    """Delete matched objects in chunks of 1000 (the S3 batch limit)."""
    BATCH = 1000
    total_deleted = 0
    all_errors = []
    keys = [obj["Key"] for obj in matched]
    for i in range(0, len(keys), BATCH):
        batch = keys[i : i + BATCH]
        deleted, errors = delete_batch(client, bucket_name, batch)
        total_deleted += deleted
        all_errors.extend(errors)
        print(f"  [{min(i + BATCH, len(keys))}/{len(keys)}] {total_deleted} deleted, {len(all_errors)} errors")
    return total_deleted, all_errors


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("-b", "--bucket", required=True, help="S3 bucket name")
    parser.add_argument("-p", "--prefix", default="", help="Only consider keys with this prefix")
    parser.add_argument("-s", "--search", help="Filter keys by substring (case-insensitive)")
    parser.add_argument("-r", "--regex", action="store_true", help="Treat --search as a regex")
    parser.add_argument("-c", "--creds", help="Path to AWS credentials YAML file")
    parser.add_argument("--anonymous", action="store_true", help="Access public bucket without credentials")
    parser.add_argument("--list-only", action="store_true", help="Only list matching files; do not delete")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete. WITHOUT THIS FLAG, this script only previews (dry-run is the default).",
    )

    args = parser.parse_args()

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
    if args.prefix:
        print(f"Prefix: '{args.prefix}'")
    if args.search:
        kind = "regex" if args.regex else "substring"
        print(f"Filter ({kind}): '{args.search}'")

    matched, skipped = list_objects(client, args.bucket, args.prefix, args.search, args.regex)
    print()
    print_summary(matched, args.search, skipped)

    if args.list_only:
        print("(--list-only — exiting without deleting)")
        return

    if not args.confirm:
        print("DRY RUN — pass --confirm to actually delete these files.")
        return

    if not matched:
        print("Nothing to delete.")
        return

    print(f"=== Deleting {len(matched)} files from {args.bucket} ===")
    deleted, errors = delete_objects(client, args.bucket, matched)
    print(f"\nDeleted: {deleted}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for err in errors[:10]:
            print(f"  {err.get('Key')}: {err.get('Message')}")
        if len(errors) > 10:
            print(f"  … and {len(errors) - 10} more")
        sys.exit(1)


if __name__ == "__main__":
    main()
