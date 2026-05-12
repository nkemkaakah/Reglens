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

# --- MONGO URIS (one secret per service — different database name in each URI) ---
resource "aws_secretsmanager_secret" "mongo_notifications_uri" {
  name                    = "reglens/mongo_notifications_uri"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-mongo-notifications-uri" }
}

resource "aws_secretsmanager_secret_version" "mongo_notifications_uri" {
  secret_id     = aws_secretsmanager_secret.mongo_notifications_uri.id
  secret_string = var.mongo_notifications_uri
}

resource "aws_secretsmanager_secret" "mongo_workflow_uri" {
  name                    = "reglens/mongo_workflow_uri"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-mongo-workflow-uri" }
}

resource "aws_secretsmanager_secret_version" "mongo_workflow_uri" {
  secret_id     = aws_secretsmanager_secret.mongo_workflow_uri.id
  secret_string = var.mongo_workflow_uri
}

resource "aws_secretsmanager_secret" "mongo_ai_registry_uri" {
  name                    = "reglens/mongo_ai_registry_uri"
  recovery_window_in_days = 0
  tags                    = { Name = "reglens-mongo-ai-registry-uri" }
}

resource "aws_secretsmanager_secret_version" "mongo_ai_registry_uri" {
  secret_id     = aws_secretsmanager_secret.mongo_ai_registry_uri.id
  secret_string = var.mongo_ai_registry_uri
}
