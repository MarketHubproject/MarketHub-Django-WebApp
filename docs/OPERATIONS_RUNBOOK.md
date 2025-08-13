# Operations Runbook 🔧

This document provides operational procedures, troubleshooting guides, and maintenance instructions for MarketHub Mobile application.

## Quick Reference

### Emergency Contacts
- **On-call DevOps**: +1-XXX-XXX-XXXX (24/7)
- **Engineering Lead**: +1-XXX-XXX-XXXX (Business hours + escalation)
- **Product Manager**: +1-XXX-XXX-XXXX (Business hours)
- **CTO**: +1-XXX-XXX-XXXX (Critical escalation only)

### Critical System URLs
- **Production API**: https://api.markethub.com
- **Staging API**: https://staging-api.markethub.com
- **Monitoring Dashboard**: https://monitoring.markethub.com
- **Status Page**: https://status.markethub.com
- **Log Aggregation**: https://logs.markethub.com

## System Architecture Overview

### Core Services
```
Mobile App (iOS/Android)
    ↓
Load Balancer (AWS ALB)
    ↓
API Gateway (Kong)
    ↓
Backend Services (Django/Node.js)
    ↓
Database (PostgreSQL + Redis)
    ↓
External Services (Firebase, Stream Chat, etc.)
```

### Infrastructure Components
- **Hosting**: AWS (us-east-1, us-west-2)
- **CDN**: CloudFlare
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis
- **Storage**: S3 (media files)
- **Monitoring**: DataDog + CloudWatch
- **Logging**: ELK Stack

## Monitoring & Alerting

### Critical Alerts (Immediate Response)

#### System Down
```
Alert: API Health Check Failed
Response: < 2 minutes
Actions:
1. Check load balancer health
2. Verify backend service status
3. Check database connectivity
4. Initiate rollback if needed
```

#### High Error Rate
```
Alert: Error rate > 5% for 5 minutes
Response: < 5 minutes
Actions:
1. Check recent deployments
2. Review error logs
3. Monitor database performance
4. Scale services if needed
```

#### Database Issues
```
Alert: Database connection errors > 10/minute
Response: < 3 minutes
Actions:
1. Check RDS instance status
2. Verify connection pool settings
3. Review slow query log
4. Failover to secondary if needed
```

### Performance Alerts (Response within 15 minutes)

#### High Response Times
```
Alert: P95 response time > 5 seconds
Actions:
1. Check API performance metrics
2. Review database query performance
3. Monitor CDN cache hit rates
4. Scale backend services if needed
```

#### Memory/CPU Usage
```
Alert: CPU > 80% or Memory > 85% for 10 minutes
Actions:
1. Check for memory leaks
2. Review resource-intensive processes
3. Scale horizontally if needed
4. Optimize queries if database-related
```

### Business Alerts (Response within 30 minutes)

#### Low Conversion Rates
```
Alert: Order conversion < 2% for 1 hour
Actions:
1. Check payment gateway status
2. Verify checkout flow functionality
3. Review recent app releases
4. Monitor user feedback
```

#### Feature Usage Drop
```
Alert: Rewards program usage < 40% for 2 hours
Actions:
1. Check feature flag status
2. Verify API endpoints
3. Review app store releases
4. Monitor user experience metrics
```

## Common Issues & Troubleshooting

### 1. App Crashes

#### Symptoms
- Crash reports in Firebase Crashlytics
- User complaints about app instability
- High crash rate in monitoring

#### Investigation Steps
```bash
# Check crash reports
curl -H "Authorization: Bearer $FIREBASE_TOKEN" \
  "https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID/crashReports"

# Review recent releases
git log --oneline --since="24 hours ago"

# Check device-specific patterns
# Review Crashlytics dashboard for device/OS patterns
```

#### Resolution
1. **Immediate**: Rollback if crash rate > 5%
2. **Short-term**: Hotfix critical issues
3. **Long-term**: Improve testing procedures

### 2. API Performance Issues

#### Symptoms
- Slow response times
- Timeouts
- High database load

#### Investigation Steps
```bash
# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.markethub.com/health

# Monitor database performance
psql -h $DB_HOST -U $DB_USER -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;"

# Check Redis cache hit rate
redis-cli info stats | grep keyspace_hits
```

#### Resolution
1. **Scale services**: Add more backend instances
2. **Optimize queries**: Index missing columns
3. **Cache frequently accessed data**
4. **Review and optimize code**

### 3. Third-party Service Issues

#### Firebase Issues
```bash
# Check Firebase service status
curl https://status.firebase.google.com/

# Verify Firebase config
firebase projects:list

# Test push notifications
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=$FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "$TEST_TOKEN", "notification": {"title": "Test"}}'
```

#### Stream Chat Issues
```bash
# Check Stream Chat status
curl https://status.getstream.io/

# Test chat token generation
curl -X POST https://api.markethub.com/auth/stream-token/ \
  -H "Authorization: Token $USER_TOKEN"

# Verify chat channel creation
# Check Stream Chat dashboard for connection issues
```

#### Payment Gateway Issues
```bash
# Test payment processing
curl -X POST https://api.markethub.com/payments/test/ \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "ZAR"}'

# Check gateway status pages
# Stripe: https://status.stripe.com/
# PayPal: https://www.paypal-status.com/
```

### 4. Database Issues

#### High Connection Count
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check connections by state
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

-- Kill long-running queries (use carefully)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query_start < now() - interval '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';
```

#### Slow Queries
```sql
-- Top slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Current running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

#### Storage Space Issues
```sql
-- Check database sizes
SELECT datname, pg_size_pretty(pg_database_size(datname)) 
FROM pg_database 
ORDER BY pg_database_size(datname) DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(size) 
FROM (
  SELECT schemaname, tablename, pg_relation_size(schemaname||'.'||tablename) AS size
  FROM pg_tables
) AS table_sizes 
ORDER BY size DESC 
LIMIT 20;
```

## Deployment Procedures

### Production Deployment Checklist

#### Pre-deployment
- [ ] Code reviewed and approved
- [ ] Tests passing (unit, integration, E2E)
- [ ] Staging deployment successful
- [ ] Database migrations tested
- [ ] Feature flags configured
- [ ] Monitoring alerts updated
- [ ] Rollback plan documented
- [ ] Stakeholders notified

#### Deployment Steps
```bash
# 1. Database migrations (if any)
kubectl exec -it backend-pod -- python manage.py migrate

# 2. Deploy backend services
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/backend

# 3. Update mobile app configuration
kubectl apply -f k8s/config-map.yaml

# 4. Verify health checks
curl https://api.markethub.com/health

# 5. Monitor metrics for 15 minutes
# Check DataDog dashboard for anomalies

# 6. Gradual traffic increase (if using canary deployment)
kubectl patch deployment backend -p '{"spec":{"replicas":3}}'
```

#### Post-deployment
- [ ] Health checks passing
- [ ] Metrics within normal range
- [ ] No error rate increase
- [ ] Key user journeys tested
- [ ] Support team notified
- [ ] Documentation updated

### Rollback Procedures

#### Automatic Rollback Triggers
```yaml
# Example Kubernetes deployment with automatic rollback
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  progressDeadlineSeconds: 300
  strategy:
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: backend
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

#### Manual Rollback
```bash
# Quick rollback to previous version
kubectl rollout undo deployment/backend

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2

# Check rollback status
kubectl rollout status deployment/backend

# Verify application health
curl https://api.markethub.com/health
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily (Automated)
- Database backups
- Log rotation
- Cache cleanup
- Health check verification
- Certificate expiry monitoring

#### Weekly (Automated + Manual Review)
- Security updates
- Performance metrics review
- Error rate analysis
- User feedback review
- Capacity planning updates

#### Monthly (Manual)
- Database optimization
- Infrastructure cost review
- Security audit
- Disaster recovery testing
- Documentation updates

### Database Maintenance

#### Backup Procedures
```bash
# Full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | \
  aws s3 cp - s3://markethub-backups/db/$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | \
  gzip | aws s3 cp - s3://markethub-backups/db/$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup integrity
aws s3 ls s3://markethub-backups/db/ --human-readable
```

#### Database Optimization
```sql
-- Update table statistics
ANALYZE;

-- Reindex tables (during maintenance window)
REINDEX DATABASE markethub;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Check for unused indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE n_distinct = 1;
```

### Security Procedures

#### SSL Certificate Renewal
```bash
# Check certificate expiry
echo | openssl s_client -servername api.markethub.com -connect api.markethub.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Renew Let's Encrypt certificates
certbot renew --dry-run

# Update load balancer certificates
aws elbv2 modify-listener --listener-arn $LISTENER_ARN \
  --certificates CertificateArn=$NEW_CERT_ARN
```

#### Security Scanning
```bash
# Dependency vulnerability scan
npm audit --audit-level high

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image markethub/backend:latest

# Infrastructure security scan
terraform plan -out=tfplan
terraform show -json tfplan | checkov -f -
```

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Critical systems**: 15 minutes
- **Non-critical systems**: 1 hour
- **Full system restoration**: 4 hours

### Recovery Point Objectives (RPO)
- **Database**: 5 minutes (continuous replication)
- **File storage**: 1 hour (S3 versioning)
- **Configuration**: Real-time (version control)

### Disaster Scenarios

#### Database Failure
```bash
# 1. Verify primary database is down
pg_isready -h $PRIMARY_DB_HOST

# 2. Promote read replica to primary
aws rds promote-read-replica --db-instance-identifier markethub-replica

# 3. Update application configuration
kubectl patch configmap backend-config -p '{"data":{"DB_HOST":"new-primary-host"}}'

# 4. Restart application pods
kubectl rollout restart deployment/backend

# 5. Verify system functionality
curl https://api.markethub.com/health
```

#### Complete AWS Region Failure
```bash
# 1. Switch to secondary region (us-west-2)
aws configure set region us-west-2

# 2. Activate standby infrastructure
terraform workspace select production-west
terraform apply -auto-approve

# 3. Update DNS to point to secondary region
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID \
  --change-batch file://dns-failover.json

# 4. Restore latest database backup
# 5. Verify all services operational
```

### Data Recovery

#### Database Point-in-Time Recovery
```bash
# Restore database to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier markethub-prod \
  --target-db-instance-identifier markethub-recovery \
  --restore-time 2024-01-15T10:30:00.000Z

# Wait for restoration to complete
aws rds describe-db-instances \
  --db-instance-identifier markethub-recovery \
  --query 'DBInstances[0].DBInstanceStatus'
```

#### File Recovery from S3
```bash
# List available versions
aws s3api list-object-versions --bucket markethub-media \
  --prefix "products/images/" --max-items 100

# Restore specific file version
aws s3api copy-object \
  --copy-source "markethub-media/products/image.jpg?versionId=VERSION_ID" \
  --bucket markethub-media \
  --key "products/image.jpg"
```

## Performance Optimization

### Application Performance

#### Backend Optimization
```python
# Database connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.getenv('DB_HOST'),
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}

# Redis caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50}
        }
    }
}
```

#### Database Optimization
```sql
-- Create indexes for frequent queries
CREATE INDEX CONCURRENTLY idx_orders_user_status 
ON orders(user_id, status);

CREATE INDEX CONCURRENTLY idx_products_category_active 
ON products(category_id, is_active) 
WHERE is_active = true;

-- Optimize frequently accessed queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM products 
WHERE category_id = 1 AND is_active = true 
ORDER BY created_at DESC LIMIT 20;
```

### Infrastructure Optimization

#### Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### CDN Optimization
```nginx
# CloudFlare page rules
# Cache everything: *.markethub.com/static/*
# Cache time: 1 month
# Browser cache TTL: 1 month

# API responses
# Cache by device type: *.markethub.com/api/products*
# Cache time: 5 minutes
# Browser cache TTL: 0
```

## Monitoring & Alerting Setup

### DataDog Configuration

#### Custom Metrics
```python
# Application metrics
from datadog import DogStatsDClient
statsd = DogStatsDClient(host='localhost', port=8125)

# Track business metrics
statsd.increment('orders.created', tags=['payment_method:card'])
statsd.histogram('api.response_time', response_time, tags=['endpoint:products'])
statsd.gauge('rewards.active_users', active_users_count)
```

#### Alert Rules
```yaml
# High error rate alert
- name: High API Error Rate
  query: avg(last_5m):avg:api.error_rate{env:production} > 5
  message: |
    API error rate is {{value}}% which is above the 5% threshold.
    Check recent deployments and review error logs.
  tags:
    - team:backend
    - severity:critical

# Database connection alert
- name: Database Connection Issues
  query: avg(last_3m):avg:postgresql.connections.used{env:production} > 80
  message: |
    Database connection usage is at {{value}}%.
    Consider scaling the connection pool or checking for connection leaks.
  tags:
    - team:devops
    - severity:warning
```

### Log Analysis

#### ELK Stack Configuration
```yaml
# Logstash pipeline
input {
  beats {
    port => 5044
  }
}

filter {
  if [kubernetes][container][name] == "backend" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
    }
    
    if [level] == "ERROR" {
      mutate {
        add_tag => [ "error" ]
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "markethub-logs-%{+YYYY.MM.dd}"
  }
}
```

#### Log Queries
```json
// Kibana queries for common issues

// API errors in last hour
{
  "query": {
    "bool": {
      "must": [
        {"match": {"kubernetes.container.name": "backend"}},
        {"match": {"level": "ERROR"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}

// Payment processing errors
{
  "query": {
    "bool": {
      "must": [
        {"match": {"message": "payment"}},
        {"match": {"level": "ERROR"}},
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  }
}
```

## Capacity Planning

### Resource Monitoring

#### Current Usage Baselines
```
Production Environment (us-east-1):
- Backend pods: 5 replicas (2 CPU, 4GB RAM each)
- Database: db.r5.xlarge (4 vCPU, 32GB RAM)
- Redis: cache.r5.large (2 vCPU, 13GB RAM)
- Storage: 500GB (70% utilized)
```

#### Growth Projections
```
Expected Growth (next 6 months):
- User base: 50% increase
- API requests: 75% increase
- Database size: 40% increase
- Storage needs: 60% increase

Recommended scaling:
- Backend: Scale to 8 replicas
- Database: Upgrade to db.r5.2xlarge
- Redis: Upgrade to cache.r5.xlarge
- Storage: Increase to 800GB
```

### Cost Optimization

#### Reserved Instances
```bash
# Check current instance usage
aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceType,State.Name]'

# Purchase reserved instances for predictable workloads
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id $OFFERING_ID \
  --instance-count 3
```

#### Storage Optimization
```bash
# Move old data to cheaper storage class
aws s3 cp s3://markethub-media/old-images/ \
  s3://markethub-archive/old-images/ \
  --storage-class STANDARD_IA --recursive

# Set lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
  --bucket markethub-media \
  --lifecycle-configuration file://lifecycle.json
```

This runbook provides comprehensive operational guidance for maintaining MarketHub Mobile in production. Keep it updated as the system evolves and new procedures are established.
