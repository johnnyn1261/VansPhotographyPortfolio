output "s3_bucket_name" {
  value       = aws_s3_bucket.portfolio.id
  description = "The name of the S3 bucket."
}

output "s3_bucket_region" {
  value       = var.aws_region
  description = "The AWS region where S3 is deployed."
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "The domain name of the CloudFront distribution."
}

output "iam_access_key_id" {
  value       = aws_iam_access_key.app_user_key.id
  description = "The IAM Access Key ID for Next.js app to upload/delete images."
}

output "iam_secret_access_key" {
  value       = aws_iam_access_key.app_user_key.secret
  description = "The IAM Secret Access Key for Next.js app. Keep this secret!"
  sensitive   = true
}
