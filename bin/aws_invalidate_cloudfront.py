#!/usr/bin/env python3

import argparse
import boto3
import yaml
import time
import sys
import os


def load_credentials(creds_filename):
    """Load AWS credentials from YAML file"""
    with open(creds_filename) as handle:
        return yaml.load(handle, Loader=yaml.SafeLoader)

def load_cloudfront_config(cloudfront_config_filename):
    """Load CloudFront configuration from YAML file"""
    try:
        with open(cloudfront_config_filename) as handle:
            return yaml.load(handle, Loader=yaml.SafeLoader)
    except FileNotFoundError:
        return None


def get_distribution_id(client, bucket_name):
    """Find CloudFront distribution ID for the given S3 bucket"""
    try:
        response = client.list_distributions()

        for dist in response.get('DistributionList', {}).get('Items', []):
            origins = dist.get('Origins', {}).get('Items', [])
            for origin in origins:
                # Check if this distribution points to our S3 bucket
                if bucket_name in origin.get('DomainName', ''):
                    return dist['Id']

        print(f"Warning: Could not find CloudFront distribution for bucket {bucket_name}")
        return None
    except Exception as e:
        print(f"Error finding distribution: {e}")
        return None


def create_invalidation(client, distribution_id, paths):
    """Create CloudFront invalidation"""
    try:
        response = client.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                },
                'CallerReference': str(time.time())
            }
        )

        invalidation_id = response['Invalidation']['Id']
        print(f"✓ Created invalidation {invalidation_id}")
        return invalidation_id
    except Exception as e:
        print(f"✗ Error creating invalidation: {e}")
        return None


def wait_for_invalidation(client, distribution_id, invalidation_id, max_wait=300):
    """Wait for invalidation to complete"""
    print("Waiting for invalidation to complete...")
    start_time = time.time()

    while time.time() - start_time < max_wait:
        try:
            response = client.get_invalidation(
                DistributionId=distribution_id,
                Id=invalidation_id
            )

            status = response['Invalidation']['Status']
            if status == 'Completed':
                print("✓ Invalidation completed successfully!")
                return True

            print(f"  Status: {status}... waiting...")
            time.sleep(10)
        except Exception as e:
            print(f"Error checking invalidation status: {e}")
            return False

    print(f"Warning: Invalidation did not complete within {max_wait} seconds")
    return False


def main():
    parser = argparse.ArgumentParser(
        description='Invalidate CloudFront cache for Olmsted deployment'
    )
    parser.add_argument(
        '-b', '--bucket',
        default='www.olmstedviz.org',
        help='S3 bucket name (default: www.olmstedviz.org)'
    )
    parser.add_argument(
        '-d', '--distribution-id',
        help='CloudFront distribution ID (will auto-detect if not provided)'
    )
    parser.add_argument(
        '-p', '--paths',
        nargs='+',
        default=['/*'],
        help='Paths to invalidate (default: /*)'
    )
    parser.add_argument(
        '-c', '--creds-filename',
        default=os.path.join(
            os.path.expanduser("~"), ".olmsted/aws-credentials.yaml"
        ),
        help='AWS credentials file'
    )
    parser.add_argument(
        '--cloudfront-config',
        default=os.path.join(
            os.path.expanduser("~"), ".olmsted/cloudfront-distribution-id.yaml"
        ),
        help='CloudFront configuration file'
    )
    parser.add_argument(
        '--no-wait',
        action='store_true',
        help="Don't wait for invalidation to complete"
    )

    args = parser.parse_args()

    # Load credentials
    print(f"Loading credentials from {args.creds_filename}")
    credentials = load_credentials(args.creds_filename)

    # Create CloudFront client
    client = boto3.client('cloudfront', **credentials)

    # Get distribution ID if not provided
    distribution_id = args.distribution_id
    if not distribution_id:
        # Try to get distribution ID from CloudFront config file
        cloudfront_config = load_cloudfront_config(args.cloudfront_config)
        if cloudfront_config and 'distribution_id' in cloudfront_config:
            distribution_id = cloudfront_config['distribution_id']
            print(f"Using distribution ID from config file: {distribution_id}")
        else:
            print(f"Finding CloudFront distribution for bucket {args.bucket}...")
            distribution_id = get_distribution_id(client, args.bucket)

        if not distribution_id:
            print("\n✗ Could not find CloudFront distribution")
            print("Please provide distribution ID with -d flag")
            sys.exit(1)

    print(f"Using CloudFront distribution: {distribution_id}")
    print(f"Invalidating paths: {', '.join(args.paths)}")

    # Create invalidation
    invalidation_id = create_invalidation(client, distribution_id, args.paths)

    if invalidation_id and not args.no_wait:
        wait_for_invalidation(client, distribution_id, invalidation_id)

    print("\n✓ CloudFront cache invalidation process complete")
    print("Note: It may take 5-10 minutes for the cache to fully clear globally")


if __name__ == "__main__":
    main()