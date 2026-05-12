# Secrets Manager — envelopes + initial versions (values from terraform.tfvars).
# DB password is the same `var.db_password` as `aws_db_instance.postgres` (rds.tf).

# --- DB PASSWORD -------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "reglens/db_password"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-db-password" }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# --- ANTHROPIC API KEY -------------------------------------------------------
resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name                    = "reglens/anthropic_api_key"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-anthropic-api-key" }
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id     = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = var.anthropic_api_key
}

# --- MONGO URI ---------------------------------------------------------------
resource "aws_secretsmanager_secret" "mongo_uri" {
  name                    = "reglens/mongo_uri"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-mongo-uri" }
}

resource "aws_secretsmanager_secret_version" "mongo_uri" {
  secret_id     = aws_secretsmanager_secret.mongo_uri.id
  secret_string = var.mongo_uri
}
