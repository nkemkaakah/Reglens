# ECS container logs — one group per service (names match what ECS task defs will use).
resource "aws_cloudwatch_log_group" "ecs_services" {
  for_each = local.services

  name              = "/ecs/reglens/${each.key}"
  retention_in_days = 7

  tags = { Name = "reglens-${each.key}-logs" }
}

# ALB 5xx — surfaces in CloudWatch console; no SNS action for staging.
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "reglens-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB is returning more than 10 5xx errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Name = "reglens-alb-5xx-alarm" }
}
