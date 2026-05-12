# ECS Fargate — wires VPC, ECR, RDS, Redis, MSK, Secrets, ALB, CloudWatch, IAM.
# MSK uses SASL/IAM (see msk.tf). Spring services include IAM client props; Node/Python
# services still use plain KAFKA_* broker lists — extend those apps for MSK IAM before
# relying on Kafka in ECS, or adjust MSK auth to match client capabilities.

locals {
  alb_base_url       = "http://${aws_lb.main.dns_name}"
  ecs_subnets        = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  ecs_security_group = [aws_security_group.ecs_tasks.id]

  # Spring Boot + aws-msk-iam-auth (classpath) — required for MSK IAM on port 9098.
  spring_kafka_msk_iam_env = [
    { name = "SPRING_KAFKA_PROPERTIES_SECURITY_PROTOCOL", value = "SASL_SSL" },
    { name = "SPRING_KAFKA_PROPERTIES_SASL_MECHANISM", value = "AWS_MSK_IAM" },
    { name = "SPRING_KAFKA_PROPERTIES_SASL_JAAS_CONFIG", value = "software.amazon.msk.auth.iam.IAMLoginModule required;" },
  ]
}

resource "aws_ecs_cluster" "main" {
  name = "reglens-${var.environment}"

  tags = { Name = "reglens-${var.environment}-cluster" }
}

# ─── obligation-service ──────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "obligation_service" {
  family                   = "reglens-obligation-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "obligation-service"
    image     = "${aws_ecr_repository.services["obligation-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8080
      hostPort      = 8080
      protocol      = "tcp"
    }]
    environment = [
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.postgres.address}:5432/reglens?currentSchema=obligation" },
      { name = "SPRING_DATASOURCE_USERNAME", value = "reglens_admin" },
      { name = "APP_SECURITY_SERVICE_TOKEN", value = "dev-service-token-change-me" },
    ]
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["obligation-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-obligation-taskdef" }
}

resource "aws_ecs_service" "obligation_service" {
  name            = "reglens-obligation-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.obligation_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["obligation-service"].arn
    container_name   = "obligation-service"
    container_port   = 8080
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["obligation-service"],
  ]

  tags = { Name = "reglens-${var.environment}-obligation-service" }
}

# ─── catalog-service ─────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "catalog_service" {
  family                   = "reglens-catalog-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "catalog-service"
    image     = "${aws_ecr_repository.services["catalog-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8081
      hostPort      = 8081
      protocol      = "tcp"
    }]
    environment = [
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.postgres.address}:5432/reglens?currentSchema=catalog" },
      { name = "SPRING_DATASOURCE_USERNAME", value = "reglens_admin" },
      { name = "APP_SECURITY_SERVICE_TOKEN", value = "dev-service-token-change-me" },
    ]
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["catalog-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-catalog-taskdef" }
}

resource "aws_ecs_service" "catalog_service" {
  name            = "reglens-catalog-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.catalog_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["catalog-service"].arn
    container_name   = "catalog-service"
    container_port   = 8081
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["catalog-service"],
  ]

  tags = { Name = "reglens-${var.environment}-catalog-service" }
}

# ─── impact-service ──────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "impact_service" {
  family                   = "reglens-impact-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "impact-service"
    image     = "${aws_ecr_repository.services["impact-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8082
      hostPort      = 8082
      protocol      = "tcp"
    }]
    environment = concat([
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.postgres.address}:5432/reglens?currentSchema=impact" },
      { name = "SPRING_DATASOURCE_USERNAME", value = "reglens_admin" },
      { name = "SPRING_KAFKA_BOOTSTRAP_SERVERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "APP_KAFKA_TOPIC_MAPPED", value = "obligation.mapped" },
      { name = "APP_KAFKA_TOPIC_IMPACT_GENERATED", value = "impact.generated" },
      { name = "APP_OBLIGATION_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/obligations" },
      { name = "APP_CATALOG_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/catalog" },
      { name = "APP_UPSTREAM_TIMEOUT_MS", value = "60000" },
    ], local.spring_kafka_msk_iam_env)
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["impact-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-impact-taskdef" }
}

resource "aws_ecs_service" "impact_service" {
  name            = "reglens-impact-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.impact_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["impact-service"].arn
    container_name   = "impact-service"
    container_port   = 8082
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["impact-service"],
  ]

  tags = { Name = "reglens-${var.environment}-impact-service" }
}

# ─── ai-registry-service ─────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "ai_registry_service" {
  family                   = "reglens-ai-registry-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "ai-registry-service"
    image     = "${aws_ecr_repository.services["ai-registry-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8083
      hostPort      = 8083
      protocol      = "tcp"
    }]
    environment = concat([
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.postgres.address}:5432/reglens?currentSchema=ai_registry" },
      { name = "SPRING_DATASOURCE_USERNAME", value = "reglens_admin" },
      { name = "SPRING_KAFKA_BOOTSTRAP_SERVERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "APP_KAFKA_TOPIC_AI_SYSTEM_LIFECYCLE", value = "ai_system.lifecycle" },
      { name = "APP_SECURITY_SERVICE_TOKEN", value = "dev-service-token-change-me" },
    ], local.spring_kafka_msk_iam_env)
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
      { name = "SPRING_DATA_MONGODB_URI", valueFrom = aws_secretsmanager_secret.mongo_ai_registry_uri.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["ai-registry-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-ai-registry-taskdef" }
}

resource "aws_ecs_service" "ai_registry_service" {
  name            = "reglens-ai-registry-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_registry_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["ai-registry-service"].arn
    container_name   = "ai-registry-service"
    container_port   = 8083
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["ai-registry-service"],
  ]

  tags = { Name = "reglens-${var.environment}-ai-registry-service" }
}

# ─── workflow-service ────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "workflow_service" {
  family                   = "reglens-workflow-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "workflow-service"
    image     = "${aws_ecr_repository.services["workflow-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8084
      hostPort      = 8084
      protocol      = "tcp"
    }]
    environment = concat([
      { name = "SPRING_KAFKA_BOOTSTRAP_SERVERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
    ], local.spring_kafka_msk_iam_env)
    secrets = [
      { name = "SPRING_DATA_MONGODB_URI", valueFrom = aws_secretsmanager_secret.mongo_workflow_uri.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["workflow-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-workflow-taskdef" }
}

resource "aws_ecs_service" "workflow_service" {
  name            = "reglens-workflow-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.workflow_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["workflow-service"].arn
    container_name   = "workflow-service"
    container_port   = 8084
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["workflow-service"],
  ]

  tags = { Name = "reglens-${var.environment}-workflow-service" }
}

# ─── mapping-service ─────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "mapping_service" {
  family                   = "reglens-mapping-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "mapping-service"
    image     = "${aws_ecr_repository.services["mapping-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "3000" },
      { name = "OBLIGATION_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/obligations" },
      { name = "CATALOG_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/catalog" },
      { name = "OBLIGATION_SERVICE_TOKEN", value = "dev-service-token-change-me" },
      { name = "KAFKA_BROKERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "KAFKA_TOPIC_MAPPED", value = "obligation.mapped" },
      { name = "KAFKA_TOPIC_MAPPING_SUGGESTED", value = "mapping.suggested" },
    ]
    secrets = [
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["mapping-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-mapping-taskdef" }
}

resource "aws_ecs_service" "mapping_service" {
  name            = "reglens-mapping-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mapping_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["mapping-service"].arn
    container_name   = "mapping-service"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["mapping-service"],
  ]

  tags = { Name = "reglens-${var.environment}-mapping-service" }
}

# ─── notification-service ────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "notification_service" {
  family                   = "reglens-notification-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "notification-service"
    image     = "${aws_ecr_repository.services["notification-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 3001
      hostPort      = 3001
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "3001" },
      { name = "KAFKA_BROKERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379" },
      { name = "KAFKA_TOPIC_MAPPED", value = "obligation.mapped" },
      { name = "KAFKA_TOPIC_MAPPING_SUGGESTED", value = "mapping.suggested" },
      { name = "KAFKA_TOPIC_DOCUMENT_INGESTED", value = "document.ingested" },
      { name = "KAFKA_TOPIC_IMPACT_GENERATED", value = "impact.generated" },
      { name = "KAFKA_TOPIC_AI_SYSTEM_LIFECYCLE", value = "ai_system.lifecycle" },
    ]
    secrets = [
      { name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.mongo_notifications_uri.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["notification-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-notification-taskdef" }
}

resource "aws_ecs_service" "notification_service" {
  name            = "reglens-notification-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notification_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["notification-service"].arn
    container_name   = "notification-service"
    container_port   = 3001
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["notification-service"],
  ]

  tags = { Name = "reglens-${var.environment}-notification-service" }
}

# ─── reg-ingestion-service (API) ─────────────────────────────────────────────
resource "aws_ecs_task_definition" "reg_ingestion_service" {
  family                   = "reglens-reg-ingestion-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "reg-ingestion-service"
    image     = "${aws_ecr_repository.services["reg-ingestion-service"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
      protocol      = "tcp"
    }]
    environment = [
      { name = "OBLIGATION_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/obligations" },
      { name = "KAFKA_BOOTSTRAP_SERVERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "KAFKA_TOPIC_DOCUMENT_INGESTED", value = "document.ingested" },
      { name = "KAFKA_TOPIC_INGEST_REQUESTED", value = "document.ingest.requested" },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/0" },
    ]
    secrets = [
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["reg-ingestion-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-reg-ingestion-taskdef" }
}

resource "aws_ecs_service" "reg_ingestion_service" {
  name            = "reglens-reg-ingestion-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.reg_ingestion_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["reg-ingestion-service"].arn
    container_name   = "reg-ingestion-service"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["reg-ingestion-service"],
  ]

  tags = { Name = "reglens-${var.environment}-reg-ingestion-service" }
}

# ─── reg-ingestion-worker (same image as API; worker.py exists in repo) ──────
resource "aws_ecs_task_definition" "reg_ingestion_worker" {
  family                   = "reglens-reg-ingestion-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "reg-ingestion-worker"
    image     = "${aws_ecr_repository.services["reg-ingestion-service"].repository_url}:${var.image_tag}"
    essential = true
    command   = ["python", "worker.py"]
    environment = [
      { name = "OBLIGATION_SERVICE_BASE_URL", value = "${local.alb_base_url}/api/obligations" },
      { name = "KAFKA_BOOTSTRAP_SERVERS", value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam },
      { name = "KAFKA_TOPIC_DOCUMENT_INGESTED", value = "document.ingested" },
      { name = "KAFKA_TOPIC_INGEST_REQUESTED", value = "document.ingest.requested" },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/0" },
    ]
    secrets = [
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["reg-ingestion-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs-worker"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-reg-ingestion-worker-taskdef" }
}

resource "aws_ecs_service" "reg_ingestion_worker" {
  name            = "reglens-reg-ingestion-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.reg_ingestion_worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  tags = { Name = "reglens-${var.environment}-reg-ingestion-worker" }
}

# ─── api-gateway ─────────────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "reglens-api-gateway"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api-gateway"
    image     = "${aws_ecr_repository.services["api-gateway"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{
      containerPort = 8090
      hostPort      = 8090
      protocol      = "tcp"
    }]
    environment = [
      { name = "GATEWAY_UPSTREAM_OBLIGATION", value = "${local.alb_base_url}/api/obligations" },
      { name = "GATEWAY_UPSTREAM_MAPPING", value = "${local.alb_base_url}/api/mappings" },
      { name = "GATEWAY_UPSTREAM_CATALOG", value = "${local.alb_base_url}/api/catalog" },
      { name = "GATEWAY_UPSTREAM_IMPACT", value = "${local.alb_base_url}/api/impact" },
      { name = "GATEWAY_UPSTREAM_AI_REGISTRY", value = "${local.alb_base_url}/api/ai-systems" },
      { name = "GATEWAY_UPSTREAM_WORKFLOW", value = "${local.alb_base_url}/api/workflow" },
      { name = "GATEWAY_UPSTREAM_INGESTION", value = "${local.alb_base_url}/api/documents" },
      { name = "GATEWAY_UPSTREAM_NOTIFICATION", value = "${local.alb_base_url}/api/notifications" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs_services["api-gateway"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = { Name = "reglens-${var.environment}-api-gateway-taskdef" }
}

resource "aws_ecs_service" "api_gateway" {
  name            = "reglens-api-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = local.ecs_subnets
    security_groups  = local.ecs_security_group
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services["api-gateway"].arn
    container_name   = "api-gateway"
    container_port   = 8090
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_target_group.services["api-gateway"],
  ]

  tags = { Name = "reglens-${var.environment}-api-gateway-service" }
}
