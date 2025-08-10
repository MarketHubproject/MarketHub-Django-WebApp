# MarketHub Infrastructure with Terraform
# This configuration sets up the complete AWS infrastructure for MarketHub

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Store terraform state in S3 (configure this for production)
  # backend "s3" {
  #   bucket = "markethub-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "MarketHub"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration
resource "aws_vpc" "markethub_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "markethub-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "markethub_igw" {
  vpc_id = aws_vpc.markethub_vpc.id

  tags = {
    Name = "markethub-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count  = 2
  vpc_id = aws_vpc.markethub_vpc.id
  
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "markethub-public-subnet-${count.index + 1}-${var.environment}"
  }
}

# Private Subnets for Database
resource "aws_subnet" "private_subnets" {
  count  = 2
  vpc_id = aws_vpc.markethub_vpc.id
  
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "markethub-private-subnet-${count.index + 1}-${var.environment}"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.markethub_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.markethub_igw.id
  }

  tags = {
    Name = "markethub-public-rt-${var.environment}"
  }
}

# Associate Route Table with Public Subnets
resource "aws_route_table_association" "public_rta" {
  count          = 2
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

# Security Groups
resource "aws_security_group" "alb_sg" {
  name_prefix = "markethub-alb-sg-"
  vpc_id      = aws_vpc.markethub_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
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

  tags = {
    Name = "markethub-alb-sg-${var.environment}"
  }
}

resource "aws_security_group" "app_sg" {
  name_prefix = "markethub-app-sg-"
  vpc_id      = aws_vpc.markethub_vpc.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "markethub-app-sg-${var.environment}"
  }
}

resource "aws_security_group" "db_sg" {
  name_prefix = "markethub-db-sg-"
  vpc_id      = aws_vpc.markethub_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  tags = {
    Name = "markethub-db-sg-${var.environment}"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "markethub_db_subnet_group" {
  name       = "markethub-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id

  tags = {
    Name = "markethub-db-subnet-group-${var.environment}"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "markethub_db" {
  identifier = "markethub-db-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "markethub"
  username = "markethub_user"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.markethub_db_subnet_group.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "markethub-db-final-snapshot-${var.environment}-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  
  tags = {
    Name = "markethub-db-${var.environment}"
  }
}

# ElastiCache Redis Subnet Group
resource "aws_elasticache_subnet_group" "markethub_redis_subnet_group" {
  name       = "markethub-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_subnets[*].id
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "markethub_redis" {
  replication_group_id       = "markethub-redis-${var.environment}"
  description                = "Redis cluster for MarketHub"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 1
  
  subnet_group_name          = aws_elasticache_subnet_group.markethub_redis_subnet_group.name
  security_group_ids         = [aws_security_group.redis_sg.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  
  tags = {
    Name = "markethub-redis-${var.environment}"
  }
}

resource "aws_security_group" "redis_sg" {
  name_prefix = "markethub-redis-sg-"
  vpc_id      = aws_vpc.markethub_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  tags = {
    Name = "markethub-redis-sg-${var.environment}"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# IAM Role for RDS Monitoring
resource "aws_iam_role" "rds_monitoring_role" {
  name = "markethub-rds-monitoring-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Name = "markethub-rds-monitoring-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_role_policy" {
  role       = aws_iam_role.rds_monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Application Load Balancer
resource "aws_lb" "markethub_alb" {
  name               = "markethub-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnets[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name = "markethub-alb-${var.environment}"
  }
}

# SSL Certificate (Let's Encrypt alternative - use ACM)
resource "aws_acm_certificate" "markethub_cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "markethub-cert-${var.environment}"
  }
}

# Target Group
resource "aws_lb_target_group" "markethub_tg" {
  name     = "markethub-tg-${var.environment}"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.markethub_vpc.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "markethub-tg-${var.environment}"
  }
}

# ALB Listeners
resource "aws_lb_listener" "markethub_listener_https" {
  load_balancer_arn = aws_lb.markethub_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.markethub_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.markethub_tg.arn
  }
}

resource "aws_lb_listener" "markethub_listener_http" {
  load_balancer_arn = aws_lb.markethub_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Outputs
output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.markethub_db.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.markethub_redis.primary_endpoint_address
}

output "load_balancer_dns" {
  description = "Load Balancer DNS name"
  value       = aws_lb.markethub_alb.dns_name
}

output "redis_auth_token" {
  description = "Redis authentication token"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}
