# Bloomverd SMS - Complete Observability Stack

## Overview

Your application now has a complete observability stack with **metrics**, **logs**, and **monitoring**.

## What's Included

### 📊 Metrics (Prometheus)
- HTTP request rates and durations
- GraphQL query performance
- Database query metrics
- Authentication events
- Error rates
- System metrics (CPU, Memory, Event Loop)

### 📝 Logs (Loki)
- All application logs in JSON format
- Structured logging with context
- Automatic HTTP/GraphQL request logging
- Error tracking with stack traces
- Searchable and filterable in Grafana

### 📈 Visualization (Grafana)
- Pre-built metrics dashboard
- Pre-built logs dashboard
- Real-time monitoring
- Custom alerting

---

## Quick Start

### 1. Start Everything

```bash
# Start monitoring stack (Prometheus, Grafana, Loki, Promtail)
docker-compose -f docker-compose.monitoring.yml up -d

# Start your application
npm run start:dev
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin)
  - Dashboards → Bloomverd SMS - API Monitoring (metrics)
  - Dashboards → Bloomverd SMS - Logs (logs)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100 (API only)

### 3. Generate Test Data

```bash
# Generate test traffic
./scripts/generate-test-traffic.sh

# Test database metrics
./scripts/test-database-metrics.sh
```

---

## Viewing Metrics

**In Grafana:**
1. Open http://localhost:3001
2. Go to Dashboards → Bloomverd SMS - API Monitoring
3. View 10 panels with real-time metrics

**In Prometheus:**
1. Open http://localhost:9090
2. Enter queries like:
   ```promql
   rate(http_requests_total[5m])
   rate(graphql_queries_total[5m])
   ```

**Raw Metrics:**
- Visit http://localhost:3000/metrics

---

## Viewing Logs

### Method 1: Grafana Log Dashboard

1. Open http://localhost:3001
2. Go to Dashboards → Bloomverd SMS - Logs
3. View logs by level, context, and type

### Method 2: Grafana Explore

1. Click Explore (compass icon)
2. Select **Loki** datasource
3. Try queries:
   ```
   {job="bloomverd-sms", level="error"}
   {job="bloomverd-sms", context="HTTP"}
   {job="bloomverd-sms"} | json | userId="user-123"
   ```

### Method 3: Log Files

```bash
# View all logs
tail -f logs/combined.log | jq '.'

# View errors only
tail -f logs/error.log | jq '.'

# Search for specific user
grep "user-123" logs/combined.log | jq '.'
```

---

## What Gets Logged Automatically

✅ **HTTP Requests**
- Method, URL, status code, duration, userId

✅ **GraphQL Operations**
- Operation name, type, variables, duration, userId

✅ **Database Queries**
- Query type (SELECT, INSERT, UPDATE, DELETE)
- Query duration
- Slow queries (> 1 second)

✅ **Errors**
- Error message, stack trace, context, metadata

✅ **Authentication**
- Login/logout events
- Failed login attempts

---

## Using Logging in Your Code

```typescript
import { AppLoggerService } from '@shared/services/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('MyService');
  }

  async myMethod() {
    // Simple logging
    this.logger.log('Processing started');
    this.logger.warn('Memory usage high');
    this.logger.error('Operation failed', error.stack);

    // Business events
    this.logger.logBusinessEvent('order_placed', {
      orderId: order.id,
      total: order.total,
    });

    // With metadata
    this.logger.logWithMetadata('info', 'Payment processed', {
      orderId: order.id,
      amount: payment.amount,
      userId: user.id,
    });
  }
}
```

---

## Documentation

Detailed documentation in `ai/documentation/`:

1. **monitoring-observability.md** - Complete monitoring implementation
2. **grafana-prometheus-usage-guide.md** - How to use dashboards
3. **logging-setup.md** - Logging configuration and usage
4. **grafana-loki-integration.md** - Log aggregation with Loki

Quick guides in `monitoring/`:
- **README.md** - Main monitoring guide
- **LOGS-QUICKSTART.md** - Quick log viewing guide

---

## Stack Architecture

```
┌─────────────────────────────────────────────┐
│           NestJS Application                │
│  ┌────────────┐        ┌─────────────┐     │
│  │  Metrics   │        │    Logs     │     │
│  │ Service    │        │  (Winston)  │     │
│  └──────┬─────┘        └──────┬──────┘     │
│         │                     │            │
└─────────┼─────────────────────┼────────────┘
          │                     │
          │ /metrics            │ writes
          ▼                     ▼
┌─────────────────┐    ┌──────────────────┐
│   Prometheus    │    │   Log Files      │
│   (Port 9090)   │    │  JSON formatted  │
└────────┬────────┘    └────────┬─────────┘
         │                      │ reads
         │                      ▼
         │             ┌──────────────────┐
         │             │    Promtail      │
         │             │  (Log shipper)   │
         │             └────────┬─────────┘
         │                      │ pushes
         │                      ▼
         │             ┌──────────────────┐
         │             │      Loki        │
         │             │   (Port 3100)    │
         │             └────────┬─────────┘
         │                      │
         └──────────┬───────────┘
                    │ queries
                    ▼
          ┌──────────────────┐
          │     Grafana      │
          │   (Port 3001)    │
          │                  │
          │  • Dashboards    │
          │  • Alerts        │
          │  • Explore       │
          └──────────────────┘
```

---

## Ports

| Service | Port | Purpose |
|---------|------|---------|
| NestJS App | 3000 | Main application |
| Grafana | 3001 | Dashboards & UI |
| Prometheus | 9090 | Metrics storage & queries |
| Loki | 3100 | Log aggregation (API only) |
| Node Exporter | 9100 | System metrics |

---

## Containers

```bash
# View all containers
docker ps

# Should see:
# - bloomverd-grafana
# - bloomverd-prometheus
# - bloomverd-loki
# - bloomverd-promtail
# - bloomverd-node-exporter
```

---

## Common Tasks

### Restart Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml restart
```

### Stop Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml down
```

### View Logs from Containers

```bash
# Grafana logs
docker logs bloomverd-grafana

# Prometheus logs
docker logs bloomverd-prometheus

# Loki logs
docker logs bloomverd-loki

# Promtail logs
docker logs bloomverd-promtail
```

### Check Container Health

```bash
# Prometheus health
curl http://localhost:9090/-/healthy

# Loki health
curl http://localhost:3100/ready

# Grafana health
curl http://localhost:3001/api/health
```

---

## Troubleshooting

### No metrics in Grafana?

1. Check Prometheus is scraping:
   - http://localhost:9090/targets
   - Should see "nestjs-app" as UP

2. Check metrics endpoint:
   - http://localhost:3000/metrics
   - Should see metrics

3. Restart Prometheus:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart prometheus
   ```

### No logs in Grafana?

1. Check log files exist:
   ```bash
   ls -la logs/
   cat logs/combined.log
   ```

2. Check Promtail is running:
   ```bash
   docker logs bloomverd-promtail
   ```

3. Check Loki is receiving logs:
   ```bash
   curl http://localhost:3100/metrics | grep loki_ingester_streams
   ```

4. Restart Promtail:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart promtail
   ```

### Grafana login not working?

Default credentials: `admin` / `admin`

Reset password:
```bash
docker exec -it bloomverd-grafana grafana-cli admin reset-admin-password newpassword
```

---

## Production Checklist

Before deploying to production:

✅ Change Grafana admin password
✅ Set up proper authentication for Prometheus
✅ Configure log retention in Loki
✅ Set up alerting (Slack, email, PagerDuty)
✅ Use environment-specific configurations
✅ Implement log rotation
✅ Monitor disk space for log/metric storage
✅ Set up SSL/TLS for all services
✅ Configure firewall rules
✅ Set up backup for Grafana dashboards

---

## Next Steps

### Immediate
1. ✅ Explore both Grafana dashboards
2. ✅ Make some API requests to generate data
3. ✅ Try log queries in Explore
4. ✅ Set up your first alert

### Short Term
1. ⬜ Create custom business metric dashboards
2. ⬜ Set up Slack/email notifications
3. ⬜ Add custom log parsing rules
4. ⬜ Create SLO dashboards

### Long Term
1. ⬜ Implement distributed tracing (Jaeger)
2. ⬜ Add APM (Application Performance Monitoring)
3. ⬜ Set up long-term metric storage (Thanos)
4. ⬜ Create executive dashboards

---

## Summary

🎉 **You now have:**

✅ Complete metrics collection (Prometheus)
✅ Structured logging (Winston)
✅ Log aggregation (Loki)
✅ Beautiful dashboards (Grafana)
✅ Real-time monitoring
✅ Automatic request/error tracking
✅ Searchable logs
✅ Ready for alerting

**All automatically configured and ready to use!**

For detailed usage, see the documentation in `ai/documentation/` and `monitoring/`.

Happy monitoring! 📊📝🎉
