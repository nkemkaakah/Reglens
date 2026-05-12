# ─── ALB — faces the internet (staging; tighten for production) ─────────────
resource "aws_security_group" "alb" {
  name        = "reglens-${var.environment}-alb"
  description = "Allow HTTP/HTTPS to the public application load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "reglens-${var.environment}-alb-sg" }
}

# ─── ECS tasks — only from ALB, not from the internet ─────────────────────────
resource "aws_security_group" "ecs_tasks" {
  name        = "reglens-${var.environment}-ecs-tasks"
  description = "Allow inbound from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "TCP from ALB to task ports"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound (RDS, Redis, MSK, APIs, ECR, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "reglens-${var.environment}-ecs-tasks-sg" }
}

# ─── RDS Postgres — only from ECS tasks ─────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "reglens-${var.environment}-rds"
  description = "Allow Postgres inbound from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "reglens-${var.environment}-rds-sg" }
}

# ─── ElastiCache Redis — only from ECS tasks ─────────────────────────────────
resource "aws_security_group" "redis" {
  name        = "reglens-${var.environment}-redis"
  description = "Allow Redis inbound from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "reglens-${var.environment}-redis-sg" }
}

# ─── MSK — ECS clients + broker↔broker (self) on listener ports ──────────────
resource "aws_security_group" "msk" {
  name        = "reglens-${var.environment}-msk"
  description = "Kafka: ECS tasks and intra-cluster replication"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Kafka plaintext / broker (ECS)"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  ingress {
    description     = "Kafka TLS (ECS)"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  ingress {
    description     = "Kafka IAM (ECS)"
    from_port       = 9098
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  ingress {
    description = "Broker replication / internal (9092)"
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Broker replication / internal (9094)"
    from_port   = 9094
    to_port     = 9094
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Broker replication / internal (9098)"
    from_port   = 9098
    to_port     = 9098
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "reglens-${var.environment}-msk-sg" }
}
