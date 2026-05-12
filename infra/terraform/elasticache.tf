# ElastiCache cluster_id max length is 20; use a short prefix so long env names still fit
# (e.g. rgl-production-redis = 20 chars).

# ─── SUBNET GROUP ────────────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "reglens-${var.environment}-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = { Name = "reglens-${var.environment}-redis-subnet-group" }
}

# ─── REDIS CLUSTER ───────────────────────────────────────────────────────────
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "rgl-${var.environment}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  snapshot_retention_limit = 0
  apply_immediately        = true

  tags = { Name = "reglens-${var.environment}-redis" }
}
