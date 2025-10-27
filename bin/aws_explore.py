#!/usr/bin/env python3

import boto3
import yaml
import os
import argparse
from datetime import datetime


def load_credentials(creds_filename):
    """Load AWS credentials from YAML file"""
    with open(creds_filename) as handle:
        return yaml.load(handle, Loader=yaml.SafeLoader)


def create_s3_client(credentials):
    """Create S3 client with credentials"""
    return boto3.client("s3", **credentials)


def list_buckets(client):
    """List all accessible S3 buckets"""
    print("\n=== Available Buckets ===")
    try:
        response = client.list_buckets()
        for bucket in response['Buckets']:
            print(f"  - {bucket['Name']} (created: {bucket['CreationDate']})")
        return [b['Name'] for b in response['Buckets']]
    except client.exceptions.ClientError as e:
        if e.response['Error']['Code'] == 'AccessDenied':
            print("  ⚠️  Access denied: You don't have permission to list all buckets")
            print("  You may still be able to access specific buckets directly")
            return []
        else:
            raise e
    except Exception as e:
        print(f"  Error listing buckets: {e}")
        return []


def explore_bucket(client, bucket_name, prefix='', max_keys=20):
    """Explore contents of a specific bucket"""
    print(f"\n=== Contents of bucket: {bucket_name} ===")
    print(f"Prefix: '{prefix}' (showing max {max_keys} items)\n")

    try:
        # List objects
        paginator = client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=bucket_name,
            Prefix=prefix,
            PaginationConfig={'MaxItems': max_keys}
        )

        total_size = 0
        file_count = 0
        dir_set = set()

        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']
                    size = obj['Size']
                    modified = obj['LastModified']

                    # Track directories
                    parts = key.split('/')
                    for i in range(1, len(parts)):
                        dir_set.add('/'.join(parts[:i]) + '/')

                    # Display file info
                    size_str = format_file_size(size)
                    print(f"  📄 {key}")
                    print(f"     Size: {size_str}, Modified: {modified}")

                    total_size += size
                    file_count += 1

        # Show directories found
        if dir_set:
            print(f"\n=== Directories found ===")
            for directory in sorted(dir_set):
                print(f"  📁 {directory}")

        print(f"\n=== Summary ===")
        print(f"Total files: {file_count}")
        print(f"Total size: {format_file_size(total_size)}")

    except Exception as e:
        print(f"Error accessing bucket: {e}")


def get_bucket_info(client, bucket_name):
    """Get detailed information about a bucket"""
    print(f"\n=== Bucket Information: {bucket_name} ===")

    try:
        # Get bucket location
        location = client.get_bucket_location(Bucket=bucket_name)
        print(f"Region: {location.get('LocationConstraint', 'us-east-1')}")

        # Try to get bucket versioning
        try:
            versioning = client.get_bucket_versioning(Bucket=bucket_name)
            print(f"Versioning: {versioning.get('Status', 'Disabled')}")
        except:
            print("Versioning: Unable to determine")

        # Try to get bucket website configuration
        try:
            website = client.get_bucket_website(Bucket=bucket_name)
            print(f"Website hosting: Enabled")
            print(f"  Index document: {website.get('IndexDocument', {}).get('Suffix', 'N/A')}")
        except:
            print("Website hosting: Disabled")

    except Exception as e:
        print(f"Error getting bucket info: {e}")


def format_file_size(size):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


def interactive_explore(client, known_bucket=None):
    """Interactive S3 exploration mode"""
    buckets = list_buckets(client)

    if not buckets and not known_bucket:
        print("\n💡 Tip: You can still explore specific buckets if you know their names")
        print("   Try: explore <bucket-name>")

    while True:
        print("\n=== Interactive S3 Explorer ===")
        print("Commands:")
        print("  list                    - List all buckets (if permitted)")
        print("  explore <bucket> [prefix] - Explore bucket contents")
        print("  info <bucket>           - Get bucket information")
        print("  quit                    - Exit")

        if known_bucket:
            print(f"\n  Known bucket from config: {known_bucket}")

        cmd = input("\nEnter command: ").strip().split()

        if not cmd:
            continue

        if cmd[0] == 'quit':
            break
        elif cmd[0] == 'list':
            list_buckets(client)
        elif cmd[0] == 'explore' and len(cmd) > 1:
            bucket = cmd[1]
            prefix = cmd[2] if len(cmd) > 2 else ''
            explore_bucket(client, bucket, prefix)
        elif cmd[0] == 'info' and len(cmd) > 1:
            get_bucket_info(client, cmd[1])
        else:
            print("Invalid command")


def main():
    parser = argparse.ArgumentParser(description='Explore S3 buckets and contents')
    parser.add_argument('-c', '--creds-filename',
                       default=os.path.join(os.path.expanduser("~"),
                                          ".olmsted/aws-credentials.yaml"),
                       help='Path to AWS credentials YAML file')
    parser.add_argument('-b', '--bucket', help='Specific bucket to explore')
    parser.add_argument('-p', '--prefix', default='', help='Prefix to filter objects')
    parser.add_argument('-i', '--interactive', action='store_true',
                       help='Interactive exploration mode')
    parser.add_argument('--info', action='store_true',
                       help='Show bucket information')
    parser.add_argument('-m', '--max-keys', type=int, default=20,
                       help='Maximum number of objects to display')

    args = parser.parse_args()

    # Load credentials and create client
    try:
        credentials = load_credentials(args.creds_filename)
        client = create_s3_client(credentials)
    except Exception as e:
        print(f"Error loading credentials: {e}")
        print(f"Make sure {args.creds_filename} exists and has proper AWS credentials")
        return

    # Execute requested operations
    if args.interactive:
        interactive_explore(client, known_bucket=args.bucket)
    elif args.bucket:
        if args.info:
            get_bucket_info(client, args.bucket)
        else:
            explore_bucket(client, args.bucket, args.prefix, args.max_keys)
    else:
        # Try to list buckets, but suggest using -b flag if it fails
        buckets = list_buckets(client)
        if not buckets:
            print("\n💡 Tip: If you know the bucket name, use:")
            print("   python3 bin/explore_s3.py -b <bucket-name>")
            print("   python3 bin/explore_s3.py -i  # for interactive mode")


if __name__ == "__main__":
    main()