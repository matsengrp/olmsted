#!/usr/bin/env python3

import argparse
import boto3
import yaml
import os
import subprocess
import sys


elide = [".git", "data"]

format_mapping = {
    ".json": "application/json",
    ".html": "text/html",
    ".css": "text/css",
    "": "text/plain",
    ".txt": "text/plain",
    ".js": "text/javascript",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".png": "image/png",
}


def load_client(args):
    with open(args.creds_filename) as handle:
        credentials = yaml.load(handle, Loader=yaml.SafeLoader)
        return boto3.client("s3", **credentials)


def content_type(path):
    _, ext = os.path.splitext(path)
    return format_mapping.get(ext, "text/plain")


def push_asset(args, localpath, key):
    if args.verbose:
        print(f"publishing {key} {content_type(key)} from local file {localpath}")
    args.client.upload_file(
        Filename=localpath,
        Bucket=args.bucket,
        Key=key,
        ExtraArgs={"ContentType": content_type(key), "ACL": "public-read"},
    )


def push_app(args, basepath=None):
    local_basepath = os.path.join(args.app_dir, basepath) if basepath else args.app_dir
    for path in os.listdir(local_basepath):
        if path not in elide:
            localpath = os.path.join(local_basepath, path)
            if os.path.isfile(localpath):
                push_asset(
                    args, localpath, os.path.join(basepath, path) if basepath else path
                )
            elif os.path.isdir(localpath):
                push_app(args, os.path.join(basepath, path) if basepath else path)


def push_data(args, basepath=None):
    local_basepath = (
        os.path.join(args.data_dir, basepath) if basepath else args.data_dir
    )
    for path in os.listdir(local_basepath):
        localpath = os.path.join(local_basepath, path)
        if os.path.isfile(localpath):
            push_asset(args, localpath, os.path.join("data", path))
        elif os.path.isdir(localpath):
            push_data(args, os.path.join(basepath, path) if basepath else path)


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "scope",
        choices=["app", "data", "full"],
        default="full",
        help="app, data, or full",
    )
    parser.add_argument("-b", "--bucket", required=True)
    parser.add_argument("-d", "--data-dir", default="_deploy/data")
    parser.add_argument("-a", "--app-dir", default="_deploy")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument(
        "-c",
        "--creds-filename",
        default=os.path.join(
            os.path.expanduser("~"), ".olmsted/aws-credentials.yaml"
        ),
        help="Must have s3 credentials here (don't forget to run `chmod go-rwx` on this file)",
    )
    parser.add_argument(
        "--invalidate-cloudfront",
        action="store_true",
        help="Invalidate CloudFront cache after deployment (requires CloudFront permissions)",
    )
    parser.add_argument(
        "--cloudfront-distribution-id",
        help="CloudFront distribution ID (required if AWS credentials lack ListDistributions permission)",
    )
    return parser.parse_args()


def main():
    args = get_args()
    args.client = load_client(args)
    if args.scope in ["app", "full"]:
        push_app(args)
    if args.scope in ["data", "full"]:
        push_data(args)

    if args.invalidate_cloudfront:
        print("Invalidating CloudFront cache...")
        try:
            cmd = [
                sys.executable,
                os.path.join(os.path.dirname(__file__), "aws_invalidate_cloudfront.py"),
                "-b", args.bucket,
                "-c", args.creds_filename
            ]
            if args.cloudfront_distribution_id:
                cmd.extend(["-d", args.cloudfront_distribution_id])

            subprocess.run(cmd, check=True)
            print("✓ CloudFront invalidation completed")
        except subprocess.CalledProcessError as e:
            print(f"✗ CloudFront invalidation failed: {e}")
            sys.exit(1)


# Eventually may want to add delete/cleanup:
# s3_resource = boto3.resource('s3')
# s3_resource.Object(second_bucket_name, first_file_name).delete()


if __name__ == "__main__":
    main()
