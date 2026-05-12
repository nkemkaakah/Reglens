# S3 — frontend (CloudFront origin, policy in cloudfront.tf) and documents (ECS task role in iam.tf).
# Uses data.aws_caller_identity.current from iam.tf (do not duplicate that data source).

# ─── Frontend — private; CloudFront OAC policy added with cloudfront.tf ──────
resource "aws_s3_bucket" "frontend" {
  bucket = "reglens-frontend-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "reglens-frontend-${var.environment}" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Documents — private PDFs/objects; ARN matches iam.tf ecs_task_s3 ───────
resource "aws_s3_bucket" "documents" {
  bucket = "reglens-documents-${data.aws_caller_identity.current.account_id}"

  tags = { Name = "reglens-documents-${var.environment}" }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
