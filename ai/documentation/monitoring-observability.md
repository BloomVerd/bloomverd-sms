# Monitoring & Observability Implementation

**Date:** 2026-01-10  
**Implemented by:** AI Assistant  
**Purpose:** Add comprehensive monitoring and observability to the Bloomverd SMS backend using Prometheus and Grafana

## Overview

This document describes the monitoring and observability infrastructure added to the Bloomverd SMS backend. The implementation provides real-time insights into application performance, health, and business metrics.

## Architecture

```
┌─────────────────┐
│   NestJS App    │
│  (Port 3000)    │
│                 │
│  /metrics       │◄─────┐
└─────────────────┘      │
                         │ Scrapes every 10s
                         │
                    ┌────▼────────┐
                    │ Prometheus  │
                    │ (Port 9090) │
                    └────┬────────┘
                         │
                         │ Datasource
                         │
                    ┌────▼────────┐
                    │  Grafana    │
                    │ (Port 3001) │
                    └─────────────┘
```

## Implementation Details

### 1. NestJS Prometheus Integration

#### Packages Installed
```bash
npm install @willsoto/nestjs-prometheus prom-client --legacy-peer-deps
```

#### Module Configuration

**File:** `src/app.module.ts`

Added PrometheusModule to the imports:

```typescript
PrometheusModule.register({
  path: '/metrics',
  defaultMetrics: {
    enabled: true,
  },
}),
```

This exposes Prometheus metrics at `http://localhost:3000/metrics`.

---

### 2. Custom Metrics Service

**File:** `src/shared/services/metrics.service.ts`

Created a centralized service to manage custom application metrics:

#### Metrics Tracked

##### HTTP Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path | HTTP request duration |

##### GraphQL Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `graphql_queries_total` | Counter | operation | Total GraphQL queries |
| `graphql_query_duration_seconds` | Histogram | operation | GraphQL query duration |
| `graphql_errors_total` | Counter | operation, error_type | GraphQL errors |

##### Database Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `db_queries_total` | Counter | query_type | Database queries |
| `db_query_duration_seconds` | Histogram | query_type | Database query duration |
| `db_connections_active` | Gauge | - | Active database connections |

##### Authentication Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `authentication_attempts_total` | Counter | method, provider | Total authentication attempts |
| `authentication_successes_total` | Counter | method, provider | Successful authentications |
| `authentication_failures_total` | Counter | method, reason, provider | Failed authentications |
| `active_sessions` | Gauge | - | Currently active user sessions |

##### SMS Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `sms_sent_total` | Counter | provider, message_type | SMS messages sent |
| `sms_failed_total` | Counter | provider, reason | Failed SMS messages |
| `sms_delivery_duration_seconds` | Histogram | provider | SMS delivery duration |

##### Entity Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `users_created_total` | Counter | role | Users created |
| `students_created_total` | Counter | organization_id | Students created |
| `organizations_created_total` | Counter | type | Organizations created |

##### File Upload Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `file_uploads_total` | Counter | file_type, status | File uploads |
| `file_upload_size_bytes` | Histogram | file_type | Upload file sizes |

##### Cache Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `cache_hits_total` | Counter | cache_type | Cache hits |
| `cache_misses_total` | Counter | cache_type | Cache misses |

##### Error Metrics
| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `application_errors_total` | Counter | error_type, context | Application errors |

#### Histogram Buckets

- **HTTP/GraphQL**: `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]` seconds
- **Database**: `[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]` seconds
- **SMS Delivery**: `[0.1, 0.5, 1, 2, 5, 10, 30]` seconds
- **File Upload Size**: `[1KB, 10KB, 100KB, 1MB, 10MB, 100MB]`

These buckets allow tracking of percentiles (p50, p95, p99).

---

### 3. Metrics Interceptor

**File:** `src/shared/interceptors/metrics.interceptor.ts`

Global interceptor that automatically tracks all requests:

#### Features

1. **Automatic HTTP Tracking**
   - Captures all HTTP requests
   - Records method, path, status code
   - Measures request duration

2. **Automatic GraphQL Tracking**
   - Captures all queries and mutations
   - Records operation name
   - Measures query duration
   - Tracks errors by type

3. **Error Handling**
   - Tracks failed requests (500 errors)
   - Categorizes GraphQL errors

#### How It Works

```typescript
// 1. Records start time
const startTime = Date.now();

// 2. Identifies context type (HTTP vs GraphQL)
const contextType = context.getType();

// 3. Tracks metrics after request completes
next.handle().pipe(
  tap({
    next: () => { /* track success */ },
    error: (error) => { /* track error */ }
  })
);
```

---

### 4. Shared Module

**File:** `src/shared/shared.module.ts`

Created a global module that:
- Provides `MetricsService` globally
- Registers all metric providers
- Configures the `MetricsInterceptor` as a global interceptor

```typescript
@Global()
@Module({
  providers: [
    MetricsService,
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class SharedModule {}
```

---

### 5. Docker Compose Stack

**File:** `docker-compose.monitoring.yml`

#### Services

1. **Prometheus**
   - Port: 9090
   - Scrapes app metrics every 10s
   - Persists data to `prometheus-data` volume

2. **Grafana**
   - Port: 3001
   - Default credentials: admin/admin
   - Auto-configured with Prometheus datasource
   - Pre-loaded with dashboard

3. **Node Exporter** (Optional)
   - Port: 9100
   - Provides system-level metrics (CPU, memory, disk, network)

#### Networking

All services are on a shared `monitoring` network for inter-container communication.

---

### 6. Prometheus Configuration

**File:** `monitoring/prometheus.yml`

#### Scrape Targets

```yaml
scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Note:** Uses `host.docker.internal` to access the host machine from Docker containers.

---

### 7. Grafana Configuration

#### Datasource Provisioning

**File:** `monitoring/grafana/provisioning/datasources/prometheus.yml`

Auto-configures Prometheus as the default datasource:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
```

#### Dashboard Provisioning

**File:** `monitoring/grafana/provisioning/dashboards/default.yml`

Auto-loads dashboards from `/var/lib/grafana/dashboards`.

---

### 8. Grafana Dashboard

**File:** `monitoring/grafana/dashboards/bloomverd-sms.json`

#### Dashboard Panels (10 total)

1. **HTTP Requests Per Second**
   - Query: `rate(http_requests_total[5m])`
   - Shows request rate by method and path

2. **HTTP Request Duration (95th percentile)**
   - Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - Shows p95 latency

3. **GraphQL Queries Per Second**
   - Query: `rate(graphql_queries_total[5m])`
   - Shows query rate by operation

4. **GraphQL Query Duration (95th percentile)**
   - Query: `histogram_quantile(0.95, rate(graphql_query_duration_seconds_bucket[5m]))`
   - Shows p95 query latency

5. **GraphQL Error Rate**
   - Query: `rate(graphql_errors_total[5m])`
   - Shows errors by operation and type

6. **Database Queries Per Second**
   - Query: `rate(db_queries_total[5m])`
   - Shows query rate by type

7. **Authentication Success vs Failures**
   - Queries: 
     - `rate(authentication_attempts_total[5m])`
     - `rate(authentication_failures_total[5m])`

8. **Memory Usage**
   - Queries:
     - `nodejs_heap_size_used_bytes`
     - `nodejs_heap_size_total_bytes`

9. **CPU Usage**
   - Queries:
     - `rate(process_cpu_user_seconds_total[5m])`
     - `rate(process_cpu_system_seconds_total[5m])`

10. **Event Loop Lag**
    - Query: `nodejs_eventloop_lag_seconds`
    - Critical for detecting performance issues

#### Dashboard Settings

- **Refresh Rate:** 10 seconds
- **Time Range:** Last 1 hour
- **Timezone:** Browser
- **Editable:** Yes

---

## File Structure

```
bloomverd-sms/
├── docker-compose.monitoring.yml
├── monitoring/
│   ├── prometheus.yml
│   ├── grafana/
│   │   ├── provisioning/
│   │   │   ├── datasources/
│   │   │   │   └── prometheus.yml
│   │   │   └── dashboards/
│   │   │       └── default.yml
│   │   └── dashboards/
│   │       └── bloomverd-sms.json
│   └── README.md
└── src/
    ├── app.module.ts (updated)
    └── shared/
        ├── services/
        │   └── metrics.service.ts (new)
        ├── interceptors/
        │   └── metrics.interceptor.ts (new)
        ├── guards/
        │   └── graphql-throttler.guard.ts (existing)
        └── shared.module.ts (new)
```

---

## Usage Guide

### Starting the Stack

```bash
# 1. Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Start the application
npm run start:dev

# 3. Access dashboards
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
# - Metrics endpoint: http://localhost:3000/metrics
```

### Stopping the Stack

```bash
# Stop containers
docker-compose -f docker-compose.monitoring.yml down

# Stop and remove data volumes
docker-compose -f docker-compose.monitoring.yml down -v
```

---

## Custom Metrics Usage Examples

### Authentication Tracking

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@shared/services/metrics.service';

@Injectable()
export class AuthService {
  constructor(private readonly metricsService: MetricsService) {}

  async login(email: string, password: string) {
    try {
      const user = await this.validateUser(email, password);
      
      // Track successful authentication (tracks attempt + success)
      this.metricsService.trackAuthentication(true, 'login', 'local');
      this.metricsService.incrementActiveSessions();
      
      return user;
    } catch (error) {
      // Track failed authentication with reason
      this.metricsService.trackAuthentication(
        false, 
        'login', 
        'local', 
        'invalid_credentials'
      );
      throw error;
    }
  }

  async logout(userId: string) {
    // Decrement active sessions on logout
    this.metricsService.decrementActiveSessions();
  }
}
```

### SMS Tracking

```typescript
@Injectable()
export class SmsService {
  constructor(private readonly metricsService: MetricsService) {}

  async sendSms(phone: string, message: string) {
    const startTime = Date.now();
    
    try {
      await this.smsProvider.send(phone, message);
      
      // Track successful SMS
      this.metricsService.trackSmsSent('twilio', 'transactional');
      this.metricsService.trackSmsDeliveryDuration(
        'twilio', 
        (Date.now() - startTime) / 1000
      );
    } catch (error) {
      // Track failed SMS with reason
      this.metricsService.trackSmsFailed('twilio', 'delivery_failed');
      throw error;
    }
  }
}
```

### Entity Creation Tracking

```typescript
@Injectable()
export class UserService {
  constructor(private readonly metricsService: MetricsService) {}

  async createUser(data: CreateUserDto) {
    const user = await this.userRepository.save(data);
    
    // Track user creation by role
    this.metricsService.trackUserCreated(user.role);
    
    return user;
  }
}

@Injectable()
export class StudentService {
  constructor(private readonly metricsService: MetricsService) {}

  async createStudent(data: CreateStudentDto) {
    const student = await this.studentRepository.save(data);
    
    // Track student creation by organization
    this.metricsService.trackStudentCreated(student.organizationId);
    
    return student;
  }
}

@Injectable()
export class OrganizationService {
  constructor(private readonly metricsService: MetricsService) {}

  async createOrganization(data: CreateOrgDto) {
    const org = await this.orgRepository.save(data);
    
    // Track organization creation by type
    this.metricsService.trackOrganizationCreated(org.type);
    
    return org;
  }
}
```

### File Upload Tracking

```typescript
@Injectable()
export class FileUploadService {
  constructor(private readonly metricsService: MetricsService) {}

  async uploadFile(file: Express.Multer.File) {
    const fileType = this.getFileType(file.mimetype);
    
    try {
      await this.s3Service.upload(file);
      
      // Track successful upload
      this.metricsService.trackFileUpload(fileType, true);
      this.metricsService.trackFileUploadSize(fileType, file.size);
    } catch (error) {
      // Track failed upload
      this.metricsService.trackFileUpload(fileType, false);
      throw error;
    }
  }
}
```

### Cache Tracking

```typescript
@Injectable()
export class CacheService {
  constructor(private readonly metricsService: MetricsService) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    
    if (value) {
      this.metricsService.trackCacheHit('redis');
      return JSON.parse(value);
    }
    
    this.metricsService.trackCacheMiss('redis');
    return null;
  }
}
```

### Error Tracking

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly metricsService: MetricsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const errorType = this.getErrorType(exception);
    const context = host.getType();
    
    // Track application error
    this.metricsService.trackApplicationError(errorType, context);
    
    // ... handle error response
  }
}
```

---

## Metrics Details

### Default Metrics (from prom-client)

These are automatically collected:

- `process_cpu_user_seconds_total` - User CPU time
- `process_cpu_system_seconds_total` - System CPU time
- `process_cpu_seconds_total` - Total CPU time
- `process_start_time_seconds` - Process start time
- `process_resident_memory_bytes` - Resident memory
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_eventloop_lag_min_seconds` - Min event loop lag
- `nodejs_eventloop_lag_max_seconds` - Max event loop lag
- `nodejs_eventloop_lag_mean_seconds` - Mean event loop lag
- `nodejs_eventloop_lag_stddev_seconds` - Stddev event loop lag
- `nodejs_eventloop_lag_p50_seconds` - p50 event loop lag
- `nodejs_eventloop_lag_p90_seconds` - p90 event loop lag
- `nodejs_eventloop_lag_p99_seconds` - p99 event loop lag
- `nodejs_active_handles` - Active handles
- `nodejs_active_handles_total` - Total active handles
- `nodejs_active_requests` - Active requests
- `nodejs_active_requests_total` - Total active requests
- `nodejs_heap_size_total_bytes` - Total heap size
- `nodejs_heap_size_used_bytes` - Used heap size
- `nodejs_external_memory_bytes` - External memory
- `nodejs_heap_space_size_total_bytes` - Heap space total
- `nodejs_heap_space_size_used_bytes` - Heap space used
- `nodejs_heap_space_size_available_bytes` - Heap space available
- `nodejs_version_info` - Node.js version

### Custom Metrics

See the "Metrics Tracked" table in section 2 above.

---

## PromQL Query Examples

### HTTP Metrics

```promql
# Request rate for a specific endpoint
rate(http_requests_total{path="/api/users"}[5m])

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate (5xx responses)
rate(http_requests_total{status_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### GraphQL Metrics

```promql
# Top 5 slowest operations
topk(5, histogram_quantile(0.99, rate(graphql_query_duration_seconds_bucket[5m])))

# Error rate by operation
rate(graphql_errors_total[5m]) / rate(graphql_queries_total[5m])
```

### Database Metrics

```promql
# Query rate by type
sum by (query_type) (rate(db_queries_total[5m]))

# Slowest query types
topk(3, histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])))

# Active database connections
db_connections_active
```

### Authentication Metrics

```promql
# Authentication success rate (percentage)
sum(rate(authentication_successes_total[5m])) / sum(rate(authentication_attempts_total[5m])) * 100

# Failed authentication attempts by reason
sum by (reason) (rate(authentication_failures_total[5m]))

# Authentication attempts by provider
sum by (provider) (rate(authentication_attempts_total[5m]))

# Current active sessions
active_sessions

# Failed logins in the last hour
sum(increase(authentication_failures_total[1h]))
```

### SMS Metrics

```promql
# SMS send rate by provider
sum by (provider) (rate(sms_sent_total[5m]))

# SMS failure rate
sum(rate(sms_failed_total[5m])) / sum(rate(sms_sent_total[5m])) * 100

# SMS delivery latency (P95)
histogram_quantile(0.95, sum(rate(sms_delivery_duration_seconds_bucket[5m])) by (le, provider))

# Failed SMS by reason
sum by (reason) (increase(sms_failed_total[24h]))
```

### Entity Metrics

```promql
# Users created by role
sum by (role) (increase(users_created_total[24h]))

# Students created per hour
sum(rate(students_created_total[1h])) * 3600

# Organization creation trend
sum(increase(organizations_created_total[7d]))
```

### File Upload Metrics

```promql
# Upload success rate
sum(rate(file_uploads_total{status="success"}[5m])) / sum(rate(file_uploads_total[5m])) * 100

# Average file size by type
histogram_quantile(0.5, sum(rate(file_upload_size_bytes_bucket[5m])) by (le, file_type))

# Failed uploads
sum by (file_type) (rate(file_uploads_total{status="failed"}[5m]))
```

### Cache Metrics

```promql
# Cache hit rate (percentage)
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) * 100

# Cache operations by type
sum by (cache_type) (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

### Error Metrics

```promql
# Error rate by type
sum by (error_type) (rate(application_errors_total[5m]))

# Errors by context (http, graphql)
sum by (context) (rate(application_errors_total[5m]))

# Total errors in last 24h
sum(increase(application_errors_total[24h]))

# Top error types
topk(5, sum by (error_type) (increase(application_errors_total[1h])))
```

---

## Troubleshooting

### Metrics Not Showing in Prometheus

1. **Check metrics endpoint:**
   ```bash
   curl http://localhost:3000/metrics
   ```

2. **Check Prometheus targets:**
   Visit http://localhost:9090/targets
   
3. **Verify Docker network:**
   ```bash
   docker network inspect monitoring_monitoring
   ```

### Grafana Shows "No Data"

1. Check Prometheus datasource connection in Grafana
2. Verify metrics exist in Prometheus: http://localhost:9090/graph
3. Adjust time range in Grafana dashboard

### High Memory Usage

Prometheus stores metrics in memory. To reduce:

1. Decrease retention period in `prometheus.yml`:
   ```yaml
   storage:
     tsdb:
       retention.time: 7d  # Default is 15d
   ```

2. Reduce scrape frequency:
   ```yaml
   scrape_interval: 30s  # Instead of 10s
   ```

---

## Production Considerations

### Security

1. **Change Grafana Password**
   ```bash
   docker exec -it bloomverd-grafana grafana-cli admin reset-admin-password <new-password>
   ```

2. **Enable Prometheus Authentication**
   Add basic auth to `prometheus.yml`

3. **Use HTTPS/TLS**
   Configure reverse proxy (nginx/traefik) with SSL

### Data Retention

```yaml
# In prometheus.yml
global:
  storage:
    tsdb:
      retention.time: 30d
      retention.size: 10GB
```

### Remote Storage

For long-term storage, consider:
- **Thanos** - Multi-cluster Prometheus
- **Cortex** - Horizontally scalable Prometheus
- **VictoriaMetrics** - High-performance storage

### High Availability

1. Run multiple Prometheus instances
2. Use federation to aggregate metrics
3. Deploy Grafana with HA configuration

### Alerting

Create alert rules in `prometheus.yml`:

```yaml
rule_files:
  - /etc/prometheus/alerts/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

Example alert:

```yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(graphql_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High GraphQL error rate"
          description: "Error rate is {{ $value }} errors/sec"
```

---

## Benefits

1. **Real-time Visibility** - See application performance in real-time
2. **Performance Optimization** - Identify slow queries and endpoints
3. **Error Detection** - Quickly spot and diagnose errors
4. **Capacity Planning** - Track resource usage trends
5. **SLA Monitoring** - Ensure performance targets are met
6. **Debugging** - Correlate events with metrics during incidents

---

## Future Enhancements

1. **Distributed Tracing** - Add Jaeger or Zipkin for request tracing
2. **Log Aggregation** - Integrate with ELK or Loki
3. **Custom Business Metrics** - Track user signups, revenue, etc.
4. **Alerting** - Set up PagerDuty/Slack notifications
5. **SLO Dashboard** - Create service level objective dashboards
6. **Cost Tracking** - Monitor AWS costs via CloudWatch

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [NestJS Prometheus Module](https://github.com/willsoto/nestjs-prometheus)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Initial implementation | AI Assistant |
| 2026-01-10 | Added comprehensive metrics: authentication (attempts/successes/failures), SMS, entity creation, file uploads, cache, errors | AI Assistant |
