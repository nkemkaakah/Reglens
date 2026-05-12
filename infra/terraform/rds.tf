# Password: only `var.db_password` (set in terraform.tfvars). Same value is stored in
# Secrets Manager (secrets.tf) for ECS; RDS uses it here — one source of truth.
# Pin a full minor; if `terraform apply` rejects it in your region, bump to an available 15.x.

# ─── SUBNET GROUP ────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "reglens-${var.environment}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = { Name = "reglens-${var.environment}-db-subnet-group" }
}

# ─── RDS POSTGRES INSTANCE ───────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier        = "reglens-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "15.12"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = "reglens"
  username = "reglens_admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = false
  skip_final_snapshot = true
  deletion_protection = false
  publicly_accessible = false

  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  tags = { Name = "reglens-${var.environment}-postgres" }
}
