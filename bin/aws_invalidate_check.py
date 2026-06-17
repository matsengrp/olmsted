#!/usr/bin/env python3

import argparse
import boto3
import yaml
import os

def load_credentials(creds_filename):
    """Load AWS credentials from YAML file"""
    with open(creds_filename) as handle:
        return yaml.load(handle, Loader=yaml.SafeLoader)

def check_invalidation_status(client, distribution_id, invalidation_id):
    """Check the status of a specific invalidation"""
    try:
        response = client.get_invalidation(
            DistributionId=distribution_id,
            Id=invalidation_id
        )

        invalidation = response['Invalidation']
        status = invalidation['Status']
        create_time = invalidation['CreateTime']

        print(f"Invalidation ID: {invalidation_id}")
        print(f"Status: {status}")
        print(f"Created: {create_time}")

        if 'Paths' in invalidation['InvalidationBatch']:
            paths = invalidation['InvalidationBatch']['Paths']['Items']
            print(f"Paths: {', '.join(paths)}")

        return status == 'Completed'

    except Exception as e:
        print(f"Error checking invalidation status: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Check CloudFront invalidation status')
    parser.add_argument('-d', '--distribution-id', required=True, help='CloudFront distribution ID')
    parser.add_argument('-i', '--invalidation-id', required=True, help='Invalidation ID to check')
    parser.add_argument(
        '-c', '--creds-filename',
        default=os.path.join(os.path.expanduser("~"), ".olmsted/aws-credentials.yaml"),
        help='AWS credentials file'
    )

    args = parser.parse_args()

    # Load credentials
    credentials = load_credentials(args.creds_filename)

    # Create CloudFront client
    client = boto3.client('cloudfront', **credentials)

    # Check invalidation status
    completed = check_invalidation_status(client, args.distribution_id, args.invalidation_id)

    if completed:
        print("\n✓ Invalidation is complete!")
    else:
        print("\n⏳ Invalidation is still in progress...")

if __name__ == "__main__":
    main()