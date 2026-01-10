# Bloomverd SMS - Monitoring & Observability

This directory contains the configuration for the complete observability stack:
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Loki** - Log aggregation
- **Promtail** - Log shipping

## Quick Start

### 1. Start the monitoring stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- Prometheus (port 9090)
- Grafana (port 3001)
- Loki (port 3100)
- Promtail (log shipper)
- Node Exporter (port 9100)

### 2. Start your NestJS application

```bash
npm run start:dev
```

### 3. Access the dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
- **Loki**: http://localhost:3100 (API only)

## What's Being Monitored

### Application Metrics

1. **HTTP Metrics**
   - Request rate per endpoint
   - Request duration (p50, p95, p99)
   - Response status codes

2. **GraphQL Metrics**
   - Query/mutation rate per operation
   - Query duration
   - Error rate by operation and error type

3. **Database Metrics**
   - Query rate by type (SELECT, INSERT, UPDATE, DELETE)
   - Query duration

4. **Authentication Metrics**
   - Successful authentication attempts
   - Failed authentication attempts
   - Breakdown by authentication method

### System Metrics (via Node Exporter)

- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Event loop lag
- Garbage collection stats

## Dashboard Panels

The default Grafana dashboard includes:

1. HTTP Requests Per Second
2. HTTP Request Duration (95th percentile)
3. GraphQL Queries Per Second
4. GraphQL Query Duration (95th percentile)
5. GraphQL Error Rate
6. Database Queries Per Second
7. Authentication Success vs Failures
8. Memory Usage (Heap)
9. CPU Usage
10. Event Loop Lag

## Endpoints

- **Metrics**: http://localhost:3000/metrics (Prometheus format)
- **Logs**: `logs/combined.log` and `logs/error.log` (JSON format)

## Dashboards

Grafana comes with two pre-configured dashboards:

1. **Bloomverd SMS - API Monitoring**
   - Metrics dashboard
   - HTTP/GraphQL performance
   - Database queries
   - Error rates

2. **Bloomverd SMS - Logs**
   - Log volume by level
   - Error logs
   - Logs by context
   - Real-time log viewer

## Viewing Logs in Grafana

See [LOGS-QUICKSTART.md](./LOGS-QUICKSTART.md) for detailed instructions.

### Quick Log Queries

In Grafana **Explore** (select Loki datasource):

```
# All logs
{job="bloomverd-sms"}

# Errors only
{job="bloomverd-sms", level="error"}

# HTTP requests
{job="bloomverd-sms", context="HTTP"}

# Search for user
{job="bloomverd-sms"} | json | userId="user-123"
```

## Custom Metrics

To track custom business metrics, use the `MetricsService`:

```typescript
import { MetricsService } from './shared/services/metrics.service';

@Injectable()
export class YourService {
  constructor(private readonly metricsService: MetricsService) {}

  async someMethod() {
    // Track authentication
    this.metricsService.trackAuthentication(true, 'jwt');

    // Track database operations
    this.metricsService.trackDbQuery('SELECT');

    // Track GraphQL operations
    this.metricsService.trackGraphQLQuery('getUserById');
  }
}
```

## Alerting (Optional)

To set up alerts:

1. Add alerting rules in `prometheus.yml`
2. Configure Alertmanager
3. Set up notification channels (email, Slack, PagerDuty, etc.)

Example alert rule:

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(graphql_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High GraphQL error rate detected"
```

## Troubleshooting

### Metrics not showing up in Prometheus

1. Check if your app is running: `curl http://localhost:3000/metrics`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify `host.docker.internal` resolves (for Docker Desktop)

### Grafana showing "No data"

1. Verify Prometheus datasource is configured
2. Check that metrics exist in Prometheus: http://localhost:9090/graph
3. Adjust time range in Grafana

### Docker containers not starting

```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs

# Restart
docker-compose -f docker-compose.monitoring.yml restart
```

## Production Considerations

1. **Data Retention**: Configure Prometheus retention policy
2. **Security**: 
   - Change default Grafana password
   - Enable authentication on Prometheus
   - Use HTTPS/TLS
3. **Scalability**: Consider using remote storage (e.g., Thanos, Cortex)
4. **High Availability**: Run multiple Prometheus instances
5. **Backup**: Regularly backup Grafana dashboards and Prometheus data

## Stopping the Stack

```bash
docker-compose -f docker-compose.monitoring.yml down
```

To remove volumes (this will delete all metrics data):

```bash
docker-compose -f docker-compose.monitoring.yml down -v
```
