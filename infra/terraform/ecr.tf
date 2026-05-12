locals {
  services = toset([
    "api-gateway",
    "obligation-service",
    "catalog-service",
    "mapping-service",
    "impact-service",
    "ai-registry-service",
    "workflow-service",
    "notification-service",
    "reg-ingestion-service",
  ])
}

resource "aws_ecr_repository" "services" {
  for_each = local.services

  name                 = "reglens-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "reglens-${each.key}" }
}

# Keep only the 10 most recent images per repo.
# Prevents unbounded storage growth (ECR charges per GB stored).
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = local.services
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
