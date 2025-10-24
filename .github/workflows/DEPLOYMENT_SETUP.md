# AWS Deployment GitHub Action Setup

## Overview
This workflow allows manual deployment to AWS S3 and CloudFront directly from GitHub with a button click.

## Setup Instructions

### 1. Create GitHub Environment
1. Go to your repository Settings → Environments
2. Click "New environment"
3. Name it: `AWS deployment`
4. Optionally add protection rules:
   - Required reviewers
   - Restrict to specific branches (e.g., `master` only)

### 2. Configure Environment Variables
In the "AWS deployment" environment, add these **Variables** (Settings → Environments → AWS deployment → Environment variables):

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `AWS_REGION` | AWS region for S3 bucket | `us-east-1` |
| `S3_BUCKET_NAME` | Target S3 bucket name | `www.olmstedviz.org` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `E2RKG9F7HJP6NG` |

### 3. Configure Environment Secrets
In the same environment, add these **Secrets** (Settings → Environments → AWS deployment → Environment secrets):

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | Generated when creating access key |

### 4. Required AWS Permissions
The AWS IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::*:distribution/YOUR_DISTRIBUTION_ID"
    }
  ]
}
```

## Usage

### Deploying via GitHub Actions

1. Go to Actions tab in your repository
2. Select "Deploy to AWS" workflow
3. Click "Run workflow" button
4. Choose options:
   - **Deploy scope**:
     - `app` - Deploy application files only
     - `data` - Deploy data files only
     - `full` - Deploy everything
   - **Invalidate CloudFront**: Whether to clear CDN cache
5. Click "Run workflow"

### Monitoring Deployment

- Check the Actions tab for real-time logs
- View deployment summary after completion
- CloudFront invalidation takes 5-15 minutes to propagate globally

## Troubleshooting

### Common Issues

1. **Access Denied errors**: Check IAM permissions
2. **Bucket not found**: Verify `S3_BUCKET_NAME` variable
3. **CloudFront invalidation fails**: Check `CLOUDFRONT_DISTRIBUTION_ID` and permissions
4. **Build fails**: Check Node.js version compatibility
5. **S3 ACL errors** (`AccessControlListNotSupported`): Some newer AWS S3 buckets have ACLs disabled by default. If you encounter ACL-related errors during deployment, either:
   - Enable ACLs in your S3 bucket settings (Bucket → Permissions → Object Ownership → ACLs enabled)
   - Remove ACL-related flags from the deployment script if your bucket uses bucket policies instead

### Testing Locally

Before deploying via GitHub Actions, test locally:

```bash
# Build the project (automatically creates _deploy/ and _deploy/data directories)
npm run build

# Preview deployment without uploading (dry-run mode)
python3 bin/aws_deploy.py app -b YOUR_BUCKET_NAME --dry-run

# Deploy to S3
python3 bin/aws_deploy.py app -b YOUR_BUCKET_NAME

# With CloudFront invalidation
python3 bin/aws_deploy.py app -b YOUR_BUCKET_NAME --invalidate-cloudfront
```

**Note**: The build process automatically creates the `_deploy/` directory structure:
- `webpack.config.prod.js` creates `_deploy/dist` and `_deploy/data` before compilation
- `bin/postbuild.sh` ensures these directories exist and copies static assets
- No manual directory setup is required

## Security Notes

- Never commit AWS credentials to the repository
- Use GitHub Environments for access control
- Regularly rotate AWS access keys
- Consider using IAM roles for production deployments