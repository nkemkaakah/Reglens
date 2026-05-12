output "frontend_bucket_name" {
  description = "S3 bucket storing the frontend static build"
  value       = aws_s3_bucket.frontend.bucket
}

output "documents_bucket_name" {
  description = "S3 bucket storing uploaded documents"
  value       = aws_s3_bucket.documents.bucket
}

output "cloudfront_domain_name" {
  description = "CloudFront domain for the frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_cloudfront_url" {
  description = "Full HTTPS URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name for backend APIs"
  value       = aws_lb.main.dns_name
}

output "postgres_endpoint" {
  description = "Postgres hostname (RDS)"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis primary endpoint (ElastiCache)"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive   = true
}

output "msk_bootstrap_brokers_sasl_iam" {
  description = "MSK bootstrap brokers for IAM-authenticated clients"
  value       = aws_msk_cluster.main.bootstrap_brokers_sasl_iam
  sensitive   = true
}
