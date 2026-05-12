# Reglens CI/CD & AWS Deployment Plan

## Overview

This document is the step-by-step execution plan for Phase 8 of Reglens: setting up CI/CD pipelines with GitHub Actions, writing Terraform infrastructure-as-code for AWS, deploying to AWS for 1–2 days to validate the full system and record demo evidence, then tearing everything down with `terraform destroy` to avoid ongoing cost. The IaC and pipelines remain in the repo permanently as demonstrable operational capability.

**Cost expectation for 1–2 day AWS deployment:** ~$10–20 total, using Confluent Cloud free tier for Kafka and MongoDB Atlas free tier.

---

## Monorepo Structure (Target)

```
reglens/
├── frontend/
├── services/
│   ├── api-gateway/
│   ├── obligation-service/
│   ├── catalog-service/
│   ├── mapping-service/
│   ├── impact-service/
│   ├── ai-registry-service/
│   ├── workflow-service/
│   ├── notification-service/
│   ├── reg-ingestion-service/
│   └── reg-ingestion-worker/
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── vpc.tf
│       ├── ecr.tf
│       ├── ecs.tf
│       ├── alb.tf
│       ├── rds.tf
│       ├── elasticache.tf
│       ├── s3.tf
│       ├── cloudfront.tf
│       ├── iam.tf
│       ├── secrets.tf
│       └── cloudwatch.tf
├── .github/
│   └── workflows/
│       ├── ci-frontend.yml
│       ├── ci-backend.yml
│       ├── docker-build-and-push.yml
│       ├── deploy-ecs-staging.yml
│       └── destroy-ecs-staging.yml
└── docker-compose.yml
```

---

## Phase 8 Steps — In Order

---

### Step 1 — Confirm Every Service Has a Dockerfile

Before anything else, every service and worker must have a working `Dockerfile`. You already have these from local development. Verify each one builds cleanly:

```bash
docker build -t test ./services/obligation-service
docker build -t test ./services/mapping-service
docker build -t test ./services/reg-ingestion-service
docker build -t test ./frontend
# ... repeat for all services
```

Each Dockerfile should produce a minimal production image. For Spring Boot services use a multi-stage build (Maven build stage → JRE runtime stage). For Node services use `node:18-alpine`. For Python use `python:3.11-slim`. For the React frontend use a build stage then `nginx:alpine` to serve the static files.

---

### Step 2 — Write the CI Pipelines

#### `ci-frontend.yml`

Implemented at `.github/workflows/ci-frontend.yml`. Triggered on pull requests and pushes to `main` when `frontend/**` (or the workflow file) changes.

1. Checkout code
2. Set up Node 20
3. `npm ci`
4. `npm run lint` (ESLint)
5. `npm run build` — runs `tsc -b && vite build` (typecheck + production bundle; no separate `typecheck` or Jest step until tests exist)

A failed lint or build blocks the merge.

#### `ci-backend.yml`

Implemented at `.github/workflows/ci-backend.yml`. Triggered on PRs and pushes to `main` when `services/**` (or the workflow file) changes. Matrix runs one job per service in parallel:

```yaml
strategy:
  matrix:
    include:
      - { name: obligation-service,    lang: java,   dir: services/obligation-service }
      - { name: catalog-service,       lang: java,   dir: services/catalog-service }
      - { name: impact-service,        lang: java,   dir: services/impact-service }
      - { name: ai-registry-service,   lang: java,   dir: services/ai-registry-service }
      - { name: workflow-service,      lang: java,   dir: services/workflow-service }
      - { name: api-gateway,           lang: java,   dir: services/api-gateway }
      - { name: mapping-service,       lang: node,   dir: services/mapping-service }
      - { name: notification-service,  lang: node,   dir: services/notification-service }
      - { name: reg-ingestion-service, lang: python, dir: services/reg-ingestion-service }
```

Each matrix job:
- **Java:** JDK 21, `./mvnw test -B` (Testcontainers use Docker on the GitHub-hosted runner)
- **Node:** Node 20, `npm ci`, `npm run build` (TypeScript compile; no `npm test` until a test script exists)
- **Python:** Python 3.11, `pip install -r requirements.txt` (includes `pytest`, `pytest-asyncio`, `respx`), then `pytest`

---

### Step 3 — Write the Docker Build & Push Pipeline

#### `docker-build-and-push.yml`

Triggered on push to `main` and on workflow dispatch (manual trigger).

This pipeline:
1. Logs in to Amazon ECR using GitHub OIDC (no long-lived AWS keys stored anywhere).
2. Builds a Docker image for every service.
3. Tags each image with the Git SHA: `<account>.dkr.ecr.<region>.amazonaws.com/reglens-<service>:<sha>`.
4. Also tags with `latest`.
5. Pushes both tags to ECR.

**GitHub OIDC setup** (one-time in AWS console):
- Create an OIDC identity provider in IAM: `token.actions.githubusercontent.com`
- Create an IAM role `reglens-github-actions-role` that trusts the OIDC provider, scoped to your repo
- Attach a policy allowing `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecs:UpdateService`, `ecs:RegisterTaskDefinition`, `sts:AssumeRole`
- Store the role ARN as a GitHub secret: `AWS_ROLE_ARN`

No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` stored anywhere. OIDC is the production-grade approach.

---

### Step 4 — Write Terraform

All Terraform lives in `infra/terraform/`. The files and what they contain:

#### `main.tf` — Provider and backend config
```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # S3 backend to store state remotely (create this bucket manually once)
  backend "s3" {
    bucket = "reglens-terraform-state"
    key    = "staging/terraform.tfstate"
    region = "eu-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}
```

#### `variables.tf` — All configurable values
Key variables: `aws_region` (default `eu-north-1`), `environment` (default `staging`), `db_password`, `anthropic_api_key`, `mongo_notifications_uri`, `mongo_workflow_uri`, `mongo_ai_registry_uri`, `image_tag` (the Git SHA from CI).

#### `vpc.tf` — Networking
- VPC with CIDR `10.0.0.0/16`
- 2 public subnets (for ALB)
- 2 private subnets (for ECS tasks, RDS, Redis)
- Internet Gateway
- NAT Gateway (1 only — single AZ is fine for a short-lived staging environment, saves ~50% NAT cost)
- Route tables

#### `ecr.tf` — Container registries
One ECR repository per service:
```hcl
resource "aws_ecr_repository" "obligation_service" {
  name                 = "reglens-obligation-service"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}
```
Repeat for all 10 services. Use a `for_each` loop with a local list of service names to keep it DRY.

#### `ecs.tf` — Cluster + task definitions + services
- One ECS cluster: `reglens-staging`
- One ECS task definition per service (Fargate launch type)
- Smallest viable Fargate sizes: `0.25 vCPU / 512 MB` for lightweight services, `0.5 vCPU / 1 GB` for Spring Boot services
- Environment variables injected from Secrets Manager ARNs and plain values
- CloudWatch log group per service
- One ECS service per task definition, placed in private subnets, attached to ALB target groups

#### `alb.tf` — Load balancer
- One ALB in public subnets
- HTTPS listener on port 443 (requires an ACM certificate — use HTTP for the short-lived staging demo to avoid cert provisioning overhead, or use AWS Certificate Manager with a domain you own)
- Listener rules routing by path prefix:
  - `/api/obligations/*` → obligation-service target group
  - `/api/catalog/*` → catalog-service target group
  - `/api/mappings/*` → mapping-service target group
  - `/api/impact/*` → impact-service target group
  - `/api/ai-systems/*` → ai-registry-service target group
  - `/api/workflow/*` → workflow-service target group
  - `/api/notifications/*` → notification-service target group
  - `/api/documents/*` → reg-ingestion-service target group
  - `/*` (default) → api-gateway target group

This means your API gateway still handles routing internally, but the ALB adds health checks and TLS termination.

#### `rds.tf` — Postgres
```hcl
resource "aws_db_instance" "postgres" {
  identifier           = "reglens-postgres"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_name              = "reglens"
  username             = "reglens_admin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = true   # important: allows terraform destroy to work cleanly
  multi_az             = false  # single AZ for staging cost saving
}
```

#### `elasticache.tf` — Redis
```hcl
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "reglens-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
}
```

#### `s3.tf` — Storage
- `reglens-frontend-<account-id>` bucket: static website hosting disabled (serve via CloudFront), public access blocked, S3 policy allows CloudFront OAC only
- `reglens-documents-<account-id>` bucket: private, for PDF uploads, no public access

#### `cloudfront.tf` — Frontend CDN
```hcl
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "reglens-frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }
  default_cache_behavior {
    target_origin_id       = "reglens-frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    # ... cache settings
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"   # required for React SPA routing
  }
  default_root_object = "index.html"
  enabled             = true
}
```

#### `iam.tf` — Roles
- `reglens-ecs-task-execution-role`: allows ECS to pull ECR images and write CloudWatch logs
- `reglens-ecs-task-role`: allows ECS tasks to read from Secrets Manager and write to S3
- `reglens-github-actions-role`: OIDC trust policy for GitHub Actions to deploy

#### `secrets.tf` — Secrets Manager
One secret per sensitive value (current stack):
- `reglens/db_password`
- `reglens/anthropic_api_key`
- `reglens/mongo_notifications_uri` (notification-service — DB name in URI path)
- `reglens/mongo_workflow_uri`
- `reglens/mongo_ai_registry_uri`

ECS task definitions reference these by ARN in the `secrets` block, so they are never in environment variables as plain text.

#### `cloudwatch.tf` — Observability
- One CloudWatch log group per service: `/ecs/reglens/<service-name>`
- Retention: 7 days (minimum — reduces cost)
- One CloudWatch alarm on ALB 5xx error rate (optional for staging but shows you know about it)

---

### Step 5 — Write the Deploy Pipeline

#### `deploy-ecs-staging.yml` (implemented under `.github/workflows/deploy-ecs-staging.yml`)

Triggered manually via `workflow_dispatch` (not automatically — you control when you want to spin up AWS and spend money).

Steps:
1. Checkout repo
2. Configure AWS credentials via OIDC (`AWS_ROLE_ARN`)
3. Set up Terraform (`terraform_wrapper: false` so `terraform output -raw` is clean)
4. `terraform init` (S3 backend: `reglens-terraform-state`, key `staging/terraform.tfstate`, region `eu-north-1` per `infra/terraform/main.tf`)
5. `terraform fmt -check` and `terraform validate`
6. `terraform plan -out=tfplan` — sensitive inputs via `TF_VAR_*` from GitHub secrets (not echoed on the command line)
7. `terraform apply -auto-approve tfplan`
8. Capture outputs: `alb_dns_name`, `cloudfront_domain_name`, `frontend_cloudfront_url`
9. Write a GitHub Actions step summary with those URLs
10. Short wait, then smoke tests: HTTPS `GET /` on CloudFront; HTTP `GET /actuator/health` on the ALB (api-gateway default target)

**Run order:** push images for the same commit first (**Docker Build and Push** tags `reglens-<service>:${{ github.sha }}`), then run this deploy so ECS can pull those tags.

**One-time prerequisites** before running this:
- Create S3 bucket for Terraform state: `aws s3 mb s3://reglens-terraform-state --region eu-north-1` (must match `main.tf` backend region)
- GitHub repository variable (optional): `AWS_REGION` — defaults to `eu-north-1` in the workflow if unset
- GitHub secrets: `AWS_ROLE_ARN`, `DB_PASSWORD`, `ANTHROPIC_API_KEY`, `MONGO_NOTIFICATIONS_URI`, `MONGO_WORKFLOW_URI`, `MONGO_AI_REGISTRY_URI` (matches `infra/terraform/variables.tf`)

---

### Step 6 — Write the Destroy Pipeline

#### `destroy-ecs-staging.yml`

Triggered manually via `workflow_dispatch` with a required confirmation input: you must type `DESTROY` to prevent accidental teardown.

Steps:
1. Checkout repo
2. Configure AWS credentials via OIDC
3. Set up Terraform
4. `terraform init`
5. `terraform destroy -var="image_tag=latest" -auto-approve`
6. Print confirmation that all resources have been torn down

```yaml
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: "Type DESTROY to confirm teardown"
        required: true

jobs:
  destroy:
    if: github.event.inputs.confirm == 'DESTROY'
    runs-on: ubuntu-latest
    steps:
      # ... terraform destroy steps
```

**After destroy**: the S3 state bucket and ECR repositories may need manual deletion (Terraform does not delete non-empty S3 buckets or ECR repos with images by default — this is a safety feature).

---

### Step 7 — The 1–2 Day Deploy Sequence

This is the actual execution order when you are ready to go live:

1. Ensure all services are passing CI (`ci-backend.yml`, `ci-frontend.yml`).
2. Trigger `docker-build-and-push.yml` manually or merge to `main` to push images to ECR.
3. Trigger `deploy-ecs-staging.yml` manually — Terraform provisions all infrastructure, ECS pulls images, services start.
4. Wait ~5 minutes for ECS tasks to reach healthy state and ALB health checks to pass.
5. Open the CloudFront URL — test the full app end to end.
6. Log in as each demo persona, test ingestion, obligations, mappings, AI registry, notifications.
7. Record your demo video.
8. Trigger `destroy-ecs-staging.yml` — type `DESTROY` — everything tears down in ~10 minutes.
9. Verify your AWS bill shows no running resources.

---

### Step 8 — What Stays in the Repo After Destroy

Everything of value is permanent in your codebase:

- All Terraform `.tf` files — the full AWS architecture as code
- All GitHub Actions workflows — the full CI/CD pipeline
- ECR repository definitions (empty, no running cost)
- Screenshots/recordings from the live deployment
- Architecture diagram in the README

Any interviewer can read your `/infra/terraform/` folder and understand exactly what production AWS infrastructure you designed and deployed. The fact that it is not running right now is irrelevant — the code is the proof.

---

## Cost Summary for 1–2 Day Deployment

| Resource | Cost/day | 2-day total |
|---|---|---|
| ECS Fargate (10 tasks, ~0.5 vCPU avg) | ~$3.50 | ~$7 |
| ALB | ~$0.45 | ~$0.90 |
| RDS Postgres db.t3.micro | ~$0.41 | ~$0.82 |
| ElastiCache cache.t3.micro | ~$0.41 | ~$0.82 |
| NAT Gateway | ~$1.10 | ~$2.20 |
| CloudFront + S3 | ~$0.10 | ~$0.20 |
| CloudWatch logs | ~$0.20 | ~$0.40 |
| Kafka | $0 (Confluent free tier) | $0 |
| MongoDB | $0 (Atlas free tier) | $0 |
| **Total** | **~$6.17** | **~$12.34** |

Destroy on day 2 and your total AWS bill for this project is approximately **$12–15**.

---

## What You Can Say In an Interview

> *"I wrote the full AWS infrastructure as Terraform — VPC, ECS Fargate, ALB, RDS, ElastiCache, S3, CloudFront, Secrets Manager, IAM with OIDC for GitHub Actions. I set up a CI/CD pipeline in GitHub Actions that builds and tests all services in a matrix, pushes images to ECR, and deploys via Terraform to ECS. I deployed the full stack to AWS for two days, validated the end-to-end flow, recorded a demo, and then ran terraform destroy to avoid ongoing cost. The Terraform and pipelines are in the repo — the infrastructure is reproducible in about 15 minutes."*

That is a complete, credible, and truthful answer.
