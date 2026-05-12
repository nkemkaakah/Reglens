# --- DATA: current AWS account ID --------------------------------------------
# Used to avoid hard-coding account IDs into policy ARNs.
data "aws_caller_identity" "current" {}

# ==============================================================================
# ROLE 1 — ECS Task Execution Role
# Used by ECS itself to pull images from ECR and write logs to CloudWatch.
# ==============================================================================
resource "aws_iam_role" "ecs_task_execution" {
  name = "reglens-ecs-task-execution-role"

  # Trust policy: only ECS tasks can assume this role.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# AWS-managed policy for ECS execution role:
# - pull from ECR
# - create/write CloudWatch logs
resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Extra permission: allow ECS agent to fetch secrets at container startup.
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "reglens-ecs-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:reglens*"
    }]
  })
}

# ==============================================================================
# ROLE 2 — ECS Task Role
# Used by your application code running inside containers.
# ==============================================================================
resource "aws_iam_role" "ecs_task" {
  name = "reglens-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Allow task code to write/read/list documents bucket objects.
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "reglens-ecs-task-s3"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::reglens-documents-${data.aws_caller_identity.current.account_id}",
        "arn:aws:s3:::reglens-documents-${data.aws_caller_identity.current.account_id}/*"
      ]
    }]
  })
}

# Allow task code to fetch secrets directly at runtime when needed.
resource "aws_iam_role_policy" "ecs_task_secrets" {
  name = "reglens-ecs-task-secrets"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:reglens*"
    }]
  })
}

# ECS tasks → MSK with IAM auth (SASL_SSL / AWS_MSK_IAM). Scoped to this cluster + topics.
resource "aws_iam_role_policy" "ecs_task_msk" {
  name = "reglens-ecs-task-msk"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeCluster"
        ]
        Resource = aws_msk_cluster.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:ReadData",
          "kafka-cluster:WriteData",
          "kafka-cluster:CreateTopic",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:DeleteTopic",
          "kafka-cluster:AlterTopic"
        ]
        Resource = "arn:aws:kafka:${var.aws_region}:${data.aws_caller_identity.current.account_id}:topic/${aws_msk_cluster.main.cluster_name}/${aws_msk_cluster.main.cluster_uuid}/*"
      }
    ]
  })
}

# ==============================================================================
# ROLE 3 — GitHub Actions OIDC Role
# Read existing role (created manually), do not recreate it in Terraform.
# ==============================================================================
data "aws_iam_role" "github_actions" {
  name = "reglens-github-actions-role"
}
