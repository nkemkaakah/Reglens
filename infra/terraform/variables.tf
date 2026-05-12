variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "anthropic_api_key" {
  type      = string
  sensitive = true
}

variable "mongo_notifications_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB URI for notification-service (database in path, e.g. .../reglens_notifications)"
}

variable "mongo_workflow_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB URI for workflow-service (e.g. .../reglens_workflow)"
}

variable "mongo_ai_registry_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB URI for ai-registry-service (e.g. .../reglens_ai_registry)"
}

variable "image_tag" {
  type        = string
  description = "Git SHA from CI — the Docker image tag to deploy"
}
