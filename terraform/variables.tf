variable "aws_region" {
  type        = string
  description = "The AWS region to deploy infrastructure into."
  default     = "us-east-1"
}

variable "bucket_name" {
  type        = string
  description = "The globally unique name of the S3 bucket to store images and configuration."
}

variable "allowed_origins" {
  type        = list(string)
  description = "A list of allowed origins for S3 CORS policy (e.g. your local dev server or custom domain)."
  default     = ["http://localhost:3000"]
}

variable "environment" {
  type        = string
  description = "The deployment environment name (e.g., development, staging, production)."
  default     = "production"
}
