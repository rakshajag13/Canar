#!/bin/bash

# CPM Project AWS Deployment Script
# This script automates the deployment of the CPM project to AWS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="cpm-backend"
ECS_CLUSTER="cpm-cluster"
ECS_SERVICE="cpm-backend"
DOMAIN_NAME="yourdomain.com"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists terraform; then
        print_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Create ECR repository
create_ecr_repository() {
    print_status "Creating ECR repository..."
    
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
        aws ecr create-repository \
            --repository-name "$ECR_REPOSITORY" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        
        print_success "ECR repository created"
    else
        print_warning "ECR repository already exists"
    fi
}

# Build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build backend image
    print_status "Building backend image..."
    docker build -t "$ECR_REPOSITORY:latest" .
    
    # Tag and push backend image
    docker tag "$ECR_REPOSITORY:latest" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
    
    # Build frontend image
    print_status "Building frontend image..."
    docker build -f Dockerfile.client -t "cpm-frontend:latest" .
    
    # Tag and push frontend image
    docker tag "cpm-frontend:latest" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/cpm-frontend:latest"
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/cpm-frontend:latest"
    
    print_success "Docker images built and pushed successfully"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    print_status "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    print_status "Planning Terraform deployment..."
    terraform plan -var="db_password=$DB_PASSWORD" -var="domain_name=$DOMAIN_NAME"
    
    # Ask for confirmation
    read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 1
    fi
    
    # Apply infrastructure
    print_status "Applying Terraform configuration..."
    terraform apply -var="db_password=$DB_PASSWORD" -var="domain_name=$DOMAIN_NAME" -auto-approve
    
    cd ..
    
    print_success "Infrastructure deployed successfully"
}

# Deploy application to ECS
deploy_application() {
    print_status "Deploying application to ECS..."
    
    # Update ECS service with new image
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --force-new-deployment \
        --region "$AWS_REGION"
    
    # Wait for deployment to complete
    print_status "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION"
    
    print_success "Application deployed successfully"
}

# Configure SSL certificate
configure_ssl() {
    print_status "Configuring SSL certificate..."
    
    # Request certificate
    CERT_ARN=$(aws acm request-certificate \
        --domain-name "$DOMAIN_NAME" \
        --subject-alternative-names "*.$DOMAIN_NAME" \
        --validation-method DNS \
        --region "$AWS_REGION" \
        --query CertificateArn \
        --output text)
    
    print_status "SSL certificate requested. ARN: $CERT_ARN"
    print_warning "Please validate the certificate in the AWS Console before proceeding"
    
    # Wait for certificate validation
    print_status "Waiting for certificate validation..."
    aws acm wait certificate-validated --certificate-arn "$CERT_ARN" --region "$AWS_REGION"
    
    print_success "SSL certificate configured successfully"
}

# Run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Get ALB DNS name
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names "cpm-alb" \
        --region "$AWS_REGION" \
        --query LoadBalancers[0].DNSName \
        --output text)
    
    # Test health endpoint
    if curl -f "http://$ALB_DNS/api/auth/health" >/dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi
    
    # Test database connectivity
    if curl -f "http://$ALB_DNS/api/user" >/dev/null 2>&1; then
        print_success "Database connectivity test passed"
    else
        print_warning "Database connectivity test failed (expected for unauthenticated requests)"
    fi
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create CloudWatch dashboard
    cat > cloudwatch-dashboard.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "$ECS_SERVICE", "ClusterName", "$ECS_CLUSTER"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "$AWS_REGION",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "cpm-db"],
          [".", "DatabaseConnections", ".", "."],
          [".", "FreeableMemory", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "$AWS_REGION",
        "title": "RDS Database Metrics"
      }
    }
  ]
}
EOF
    
    # Create dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "CPM-Monitoring" \
        --dashboard-body file://cloudwatch-dashboard.json \
        --region "$AWS_REGION"
    
    print_success "Monitoring dashboard created"
}

# Setup CI/CD pipeline
setup_cicd() {
    print_status "Setting up CI/CD pipeline..."
    
    # Create GitHub Actions workflow directory
    mkdir -p .github/workflows
    
    # Create deployment workflow
    cat > .github/workflows/deploy.yml << EOF
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: $AWS_REGION
  ECR_REPOSITORY: $ECR_REPOSITORY
  ECS_CLUSTER: $ECS_CLUSTER
  ECS_SERVICE: $ECS_SERVICE

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: \${{ env.AWS_REGION }}
        
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
      
    - name: Build, tag, and push image to Amazon ECR
      env:
        ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: \${{ github.sha }}
      run: |
        docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
        docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
        echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT
        
    - name: Deploy to ECS
      run: |
        aws ecs update-service \\
          --cluster \$ECS_CLUSTER \\
          --service \$ECS_SERVICE \\
          --force-new-deployment
          
    - name: Wait for deployment to complete
      run: |
        aws ecs wait services-stable \\
          --cluster \$ECS_CLUSTER \\
          --services \$ECS_SERVICE
EOF
    
    print_success "CI/CD pipeline configured"
    print_warning "Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets to your GitHub repository"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "CPM Project AWS Deployment Script"
    echo "=========================================="
    
    # Check if DB_PASSWORD is set
    if [ -z "$DB_PASSWORD" ]; then
        print_error "DB_PASSWORD environment variable is not set"
        print_status "Please set it with: export DB_PASSWORD='your-secure-password'"
        exit 1
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Create ECR repository
    create_ecr_repository
    
    # Build and push images
    build_and_push_images
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Deploy application
    deploy_application
    
    # Configure SSL (optional)
    read -p "Do you want to configure SSL certificate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_ssl
    fi
    
    # Run health checks
    run_health_checks
    
    # Setup monitoring
    setup_monitoring
    
    # Setup CI/CD
    read -p "Do you want to setup CI/CD pipeline? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_cicd
    fi
    
    echo "=========================================="
    print_success "Deployment completed successfully!"
    echo "=========================================="
    echo ""
    echo "Your application is now deployed to AWS with the following features:"
    echo "✅ Multi-AZ deployment for high availability"
    echo "✅ Auto-scaling ECS services"
    echo "✅ Load balancer with health checks"
    echo "✅ RDS PostgreSQL database"
    echo "✅ ElastiCache Redis for caching"
    echo "✅ CloudWatch monitoring and logging"
    echo "✅ SSL/TLS encryption (if configured)"
    echo "✅ CI/CD pipeline (if configured)"
    echo ""
    echo "Next steps:"
    echo "1. Update your DNS records to point to the ALB"
    echo "2. Configure your domain in the application"
    echo "3. Set up monitoring alerts"
    echo "4. Configure backup policies"
    echo ""
    echo "For more information, see the AWS_DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"
