#!/usr/bin/env python3

import boto3
import yaml
import os
import argparse
import re
from pathlib import Path


def load_credentials(creds_filename):
    """Load AWS credentials from YAML file"""
    with open(creds_filename) as handle:
        return yaml.load(handle, Loader=yaml.SafeLoader)


def create_s3_client(credentials=None):
    """Create S3 client with or without credentials"""
    if credentials:
        return boto3.client("s3", **credentials)
    else:
        # Try anonymous access for public buckets
        from botocore import UNSIGNED
        from botocore.config import Config
        return boto3.client('s3', config=Config(signature_version=UNSIGNED))


def download_file(client, bucket_name, key, local_path):
    """Download a single file from S3"""
    try:
        # Create directory if needed
        local_file = Path(local_path) / key
        local_file.parent.mkdir(parents=True, exist_ok=True)

        # Download the file
        client.download_file(bucket_name, key, str(local_file))
        return True
    except Exception as e:
        print(f"  ❌ Error downloading {key}: {e}")
        return False


def download_bucket(client, bucket_name, local_path, prefix='', search_term=None, use_regex=False):
    """Download files from an S3 bucket with optional search filtering"""
    print(f"\n=== Downloading from bucket: {bucket_name} ===")
    print(f"Local path: {local_path}")
    print(f"Prefix: '{prefix}'")
    if search_term:
        if use_regex:
            print(f"Regex filter: '{search_term}'")
        else:
            print(f"Search filter: '{search_term}'")
    print()

    # Create local directory
    local_dir = Path(local_path)
    local_dir.mkdir(parents=True, exist_ok=True)

    # Compile regex pattern if needed
    pattern = None
    if search_term and use_regex:
        try:
            pattern = re.compile(search_term, re.IGNORECASE)
        except re.error as e:
            print(f"❌ Invalid regex pattern: {e}")
            return

    try:
        # List ALL objects (no pagination limit)
        paginator = client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=bucket_name,
            Prefix=prefix
        )

        total_files = 0
        downloaded = 0
        failed = 0
        skipped = 0
        total_size = 0

        # First pass: count total files and filter
        all_objects = []
        filtered_objects = []
        for page in page_iterator:
            if 'Contents' in page:
                all_objects.extend(page['Contents'])

        # Apply search filter if provided
        for obj in all_objects:
            key = obj['Key']
            if key.endswith('/'):
                continue
            if search_term:
                # Use regex or simple search based on flag
                if use_regex:
                    if pattern.search(key):
                        filtered_objects.append(obj)
                    else:
                        skipped += 1
                else:
                    # Case-insensitive substring search
                    if search_term.lower() in key.lower():
                        filtered_objects.append(obj)
                    else:
                        skipped += 1
            else:
                filtered_objects.append(obj)

        total_files = len(filtered_objects)

        if search_term:
            print(f"Found {total_files} files matching '{search_term}' (skipped {skipped} non-matching files)\n")
        else:
            print(f"Found {total_files} files to download\n")

        if total_files == 0:
            print("No files to download.")
            return

        # Second pass: download filtered files
        for i, obj in enumerate(filtered_objects, 1):
            key = obj['Key']
            size = obj['Size']

            print(f"[{i}/{total_files}] Downloading: {key} ({format_file_size(size)})")

            if download_file(client, bucket_name, key, local_path):
                downloaded += 1
                total_size += size
            else:
                failed += 1

        print(f"\n=== Download Summary ===")
        print(f"✅ Successfully downloaded: {downloaded} files")
        if failed > 0:
            print(f"❌ Failed: {failed} files")
        if search_term and skipped > 0:
            print(f"⏭️  Skipped (didn't match search): {skipped} files")
        print(f"Total size: {format_file_size(total_size)}")
        print(f"Files saved to: {local_path}")

    except Exception as e:
        print(f"Error accessing bucket: {e}")


def list_all_files(client, bucket_name, prefix='', search_term=None, use_regex=False):
    """List all files in bucket (no limit) with optional search filtering"""
    print(f"\n=== All files in bucket: {bucket_name} ===")
    if prefix:
        print(f"Prefix: '{prefix}'")
    if search_term:
        if use_regex:
            print(f"Regex filter: '{search_term}'")
        else:
            print(f"Search filter: '{search_term}'")
    print()

    # Compile regex pattern if needed
    pattern = None
    if search_term and use_regex:
        try:
            pattern = re.compile(search_term, re.IGNORECASE)
        except re.error as e:
            print(f"❌ Invalid regex pattern: {e}")
            return

    try:
        paginator = client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=bucket_name,
            Prefix=prefix
        )

        total_size = 0
        file_count = 0
        skipped_count = 0

        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']
                    size = obj['Size']
                    modified = obj['LastModified']

                    # Skip if doesn't match search term
                    if search_term:
                        # Use regex or simple search based on flag
                        if use_regex:
                            if not pattern.search(key):
                                skipped_count += 1
                                continue
                        else:
                            # Case-insensitive substring search
                            if search_term.lower() not in key.lower():
                                skipped_count += 1
                                continue

                    # Display file info
                    size_str = format_file_size(size)
                    print(f"  📄 {key}")
                    print(f"     Size: {size_str}, Modified: {modified}")

                    total_size += size
                    file_count += 1

        print(f"\n=== Summary ===")
        if search_term:
            filter_type = "regex" if use_regex else "search"
            print(f"Files matching {filter_type} '{search_term}': {file_count}")
            if skipped_count > 0:
                print(f"Files not matching: {skipped_count}")
        else:
            print(f"Total files: {file_count}")
        print(f"Total size: {format_file_size(total_size)}")

    except Exception as e:
        print(f"Error accessing bucket: {e}")


def format_file_size(size):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


def main():
    parser = argparse.ArgumentParser(
        description='Download all files from an S3 bucket with optional regex filtering',
        epilog="""
Examples:
  # List all .js files (not .json)
  %(prog)s -b mybucket --list-only --regex -s '\\.js$'

  # Download only .json files
  %(prog)s -b mybucket --regex -s '\\.json$'

  # Download files containing "main" but not "main.js"
  %(prog)s -b mybucket --regex -s 'main(?!\\.js)'

  # Simple substring search (no regex)
  %(prog)s -b mybucket -s main
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('-b', '--bucket', required=True,
                        help='S3 bucket name')
    parser.add_argument('-o', '--output', default='./s3-download',
                        help='Local directory to save files (default: ./s3-download)')
    parser.add_argument('-p', '--prefix', default='',
                        help='Only download files with this prefix')
    parser.add_argument('-s', '--search',
                        help='Search term to filter files (case-insensitive)')
    parser.add_argument('-r', '--regex', action='store_true',
                        help='Treat search term as regex pattern')
    parser.add_argument('-c', '--creds',
                        help='Path to AWS credentials YAML file')
    parser.add_argument('--list-only', action='store_true',
                        help='Only list files without downloading')
    parser.add_argument('--anonymous', action='store_true',
                        help='Access public bucket without credentials')

    args = parser.parse_args()

    # Create S3 client
    if args.creds:
        print(f"Loading credentials from: {args.creds}")
        creds = load_credentials(args.creds)
        client = create_s3_client(creds)
    elif args.anonymous:
        print("Using anonymous access (public bucket)")
        client = create_s3_client()
    else:
        # Try default credentials
        print("Using default AWS credentials")
        client = boto3.client('s3')

    # List or download
    if args.list_only:
        list_all_files(client, args.bucket, args.prefix, args.search, args.regex)
    else:
        download_bucket(client, args.bucket, args.output, args.prefix, args.search, args.regex)


if __name__ == "__main__":
    main()