#!/usr/bin/env python

import argparse
import boto3
import yaml
import os


elide = ['.git', 'data']

format_mapping = {
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '': 'text/plain',
    '.txt': 'text/plain',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'}


def load_client(args):
    with open(args.creds_filename) as handle:
        credentials = yaml.load(handle)
        return boto3.client('s3', **credentials)

def content_type(path):
    _, ext = os.path.splitext(path)
    return format_mapping.get(ext, 'text/plain')

def push_asset(args, localpath, key):
    if args.verbose:
        print "publishing", key, content_type(key)
    args.client.upload_file(Filename=localpath, Bucket=args.bucket, Key=key,
            ExtraArgs={'ContentType': content_type(key), 'ACL': "public-read"})

def push_app(args, basepath=None):
    local_basepath = os.path.join(args.app_dir, basepath) if basepath else args.app_dir
    for path in os.listdir(local_basepath):
        if path not in elide:
            localpath = os.path.join(local_basepath, path)
            if os.path.isfile(localpath):
                push_asset(args, localpath, os.path.join(basepath, path) if basepath else path)
            elif os.path.isdir(localpath):
                push_app(args, os.path.join(basepath, path) if basepath else path)


def push_data(args, basepath=None):
    local_basepath = os.path.join(args.data_dir, basepath) if basepath else args.data_dir
    for path in os.listdir(local_basepath):
        localpath = os.path.join(local_basepath, path)
        if os.path.isfile(localpath):
            push_asset(args, localpath, os.path.join('data', path))
        elif os.path.isdir(localpath):
            push_app(args, os.path.join(basepath, path) if basepath else path)


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('scope', choices=['app', 'data', 'full'], default="full",
        help="app, data, or full")
    parser.add_argument('-b', '--bucket', required=True)
    parser.add_argument('-d', '--data-dir', default="deploy/data")
    parser.add_argument('-a', '--app-dir', default="deploy")
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('-c', '--creds-filename',
        default=os.path.join(os.path.expanduser('~'), ".olmsted/deploy-credentials.yaml"),
        help="Must have s3 credentials here (don't forget to run `chmod go-rwx` on this file)")
    return parser.parse_args()

def main():
    args = get_args()
    args.client = load_client(args)
    if args.scope in ['app', 'full']:
        push_app(args)
    if args.scope in ['data', 'full']:
        push_data(args)


# Eventually may want to add delete/cleanup:
# s3_resource = boto3.resource('s3')
# s3_resource.Object(second_bucket_name, first_file_name).delete()




if __name__ == '__main__':
    main()



