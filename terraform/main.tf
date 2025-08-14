terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "cpm-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

# RDS Database
module "rds" {
  source = "./modules/rds"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  db_name         = var.db_name
  db_username     = var.db_username
  db_password     = var.db_password
  security_groups = [module.vpc.rds_security_group_id]
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [module.vpc.redis_security_group_id]
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"
  
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  db_endpoint        = module.rds.endpoint
  redis_endpoint     = module.redis.endpoint
  app_image          = var.app_image
  app_count          = var.app_count
}

# S3 Bucket for Static Files
module "s3" {
  source = "./modules/s3"
  
  environment = var.environment
  domain_name = var.domain_name
}

# CloudFront Distribution
module "cloudfront" {
  source = "./modules/cloudfront"
  
  environment = var.environment
  domain_name = var.domain_name
  s3_bucket   = module.s3.bucket_name
  alb_domain  = module.ecs.alb_domain_name
}

# Route 53 DNS
module "route53" {
  source = "./modules/route53"
  
  domain_name       = var.domain_name
  cloudfront_domain = module.cloudfront.domain_name
  alb_domain        = module.ecs.alb_domain_name
}

# Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.cloudfront.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for static files"
  value       = module.s3.bucket_name
}
