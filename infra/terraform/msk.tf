# MSK — managed Kafka (IAM auth, TLS to clients). Pin kafka_version to a minor MSK supports in your region.

resource "aws_msk_configuration" "main" {
  name           = "reglens-${var.environment}-kafka-config"
  kafka_versions = ["3.6.0"]

  server_properties = <<-EOT
    auto.create.topics.enable=true
    default.replication.factor=2
    min.insync.replicas=1
    num.partitions=3
    log.retention.hours=24
    offsets.topic.replication.factor=2
    transaction.state.log.replication.factor=2
    transaction.state.log.min.isr=1
  EOT
}

resource "aws_msk_cluster" "main" {
  cluster_name           = "reglens-${var.environment}-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 2

  broker_node_group_info {
    instance_type  = "kafka.t3.small"
    client_subnets = [aws_subnet.private_a.id, aws_subnet.private_b.id]

    storage_info {
      ebs_storage_info {
        volume_size = 20
      }
    }

    security_groups = [aws_security_group.msk.id]
  }

  client_authentication {
    sasl {
      iam = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  tags = { Name = "reglens-${var.environment}-kafka" }
}
