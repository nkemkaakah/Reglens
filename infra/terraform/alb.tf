# Application Load Balancer — public entrypoint; path-based routing to ECS (Fargate) via IP target groups.

resource "aws_lb" "main" {
  name               = "reglens-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = false

  tags = { Name = "reglens-${var.environment}-alb" }
}

locals {
  target_groups = {
    api-gateway           = { port = 8090, health_check_path = "/health" }
    obligation-service    = { port = 8080, health_check_path = "/actuator/health" }
    catalog-service       = { port = 8081, health_check_path = "/actuator/health" }
    mapping-service       = { port = 3000, health_check_path = "/health" }
    impact-service        = { port = 8082, health_check_path = "/actuator/health" }
    ai-registry-service   = { port = 8083, health_check_path = "/actuator/health" }
    workflow-service      = { port = 8084, health_check_path = "/actuator/health" }
    notification-service  = { port = 3001, health_check_path = "/health" }
    reg-ingestion-service = { port = 8000, health_check_path = "/health" }
  }
}

resource "aws_lb_target_group" "services" {
  for_each = local.target_groups

  # substr(..., 0, 12) can end on "-"; ALB target group names cannot end with a hyphen.
  name        = "rgl-${var.environment}-${trim(substr(each.key, 0, 12), "-")}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = each.value.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "reglens-${var.environment}-${each.key}" }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api-gateway"].arn
  }
}

resource "aws_lb_listener_rule" "obligation" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["obligation-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/obligations", "/api/obligations/*"]
    }
  }
}

resource "aws_lb_listener_rule" "catalog" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["catalog-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/catalog", "/api/catalog/*"]
    }
  }
}

resource "aws_lb_listener_rule" "mapping" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["mapping-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/mappings", "/api/mappings/*"]
    }
  }
}

resource "aws_lb_listener_rule" "impact" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["impact-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/impact", "/api/impact/*"]
    }
  }
}

resource "aws_lb_listener_rule" "ai_registry" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["ai-registry-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/ai-systems", "/api/ai-systems/*"]
    }
  }
}

resource "aws_lb_listener_rule" "workflow" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 60

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["workflow-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/workflow", "/api/workflow/*"]
    }
  }
}

resource "aws_lb_listener_rule" "notification" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 70

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["notification-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/notifications", "/api/notifications/*"]
    }
  }
}

resource "aws_lb_listener_rule" "ingestion" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 80

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["reg-ingestion-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/documents", "/api/documents/*"]
    }
  }
}
