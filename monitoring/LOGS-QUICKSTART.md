# Viewing Logs in Grafana - Quick Start

## Setup

1. **Start the monitoring stack (includes Loki + Promtail now)**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Start your application**
   ```bash
   npm run start:dev
   ```

3. **Generate some logs**
   - Make API requests
   - Or run: `./scripts/generate-test-traffic.sh`

4. **Access Grafana**
   - URL: http://localhost:3001
   - Login: admin / admin

## View Logs

### Option 1: Pre-built Log Dashboard

1. Go to **Dashboards** → **Bloomverd SMS - Logs**
2. You'll see:
   - Log volume by level (info, warn, error)
   - Error rate over time
   - Recent error logs
   - Logs by context (HTTP, GraphQL, Database, Auth)
   - Separate panels for different log types

### Option 2: Explore Logs Directly

1. Click **Explore** (compass icon) in left sidebar
2. Select **Loki** datasource (dropdown at top)
3. Try these queries:

**All logs:**
```
{job="bloomverd-sms"}
```

**Only errors:**
```
{job="bloomverd-sms", level="error"}
```

**Only warnings:**
```
{job="bloomverd-sms", level="warn"}
```

**HTTP requests:**
```
{job="bloomverd-sms", context="HTTP"}
```

**GraphQL operations:**
```
{job="bloomverd-sms", context="GraphQL"}
```

**Authentication logs:**
```
{job="bloomverd-sms", context="Auth"}
```

**Database queries:**
```
{job="bloomverd-sms", context="Database"}
```

**Search for specific text:**
```
{job="bloomverd-sms"} |= "user-123"
```

**Filter errors containing "database":**
```
{job="bloomverd-sms", level="error"} |= "database"
```

**Exclude info logs:**
```
{job="bloomverd-sms"} != "info"
```

**Parse JSON and filter:**
```
{job="bloomverd-sms"} | json | userId="user-123"
```

**Count error rate:**
```
sum(rate({job="bloomverd-sms", level="error"}[5m]))
```

**Top 10 error messages:**
```
topk(10, sum by (message) (count_over_time({job="bloomverd-sms", level="error"}[1h])))
```

## What's in the Logs?

Each log entry contains:

```json
{
  "timestamp": "2026-01-10 15:30:45",
  "level": "info",
  "message": "HTTP Request",
  "context": "HTTP",
  "method": "GET",
  "url": "/api/students",
  "statusCode": 200,
  "duration": "45ms",
  "userId": "user-123",
  "service": "bloomverd-sms",
  "environment": "development"
}
```

## Useful Filters

**By User:**
```
{job="bloomverd-sms"} | json | userId="user-123"
```

**Slow requests (> 1 second):**
```
{job="bloomverd-sms", context="HTTP"} | json | duration > 1000
```

**Failed GraphQL operations:**
```
{job="bloomverd-sms", context="GraphQL", level="error"}
```

**Failed login attempts:**
```
{job="bloomverd-sms", context="Auth"} |= "login_failed"
```

**Database errors:**
```
{job="bloomverd-sms", context="Database", level="error"}
```

## Troubleshooting

### No logs appearing?

1. **Check if Loki is running:**
   ```bash
   docker ps | grep loki
   ```

2. **Check if Promtail is running:**
   ```bash
   docker ps | grep promtail
   ```

3. **Check Promtail logs:**
   ```bash
   docker logs bloomverd-promtail
   ```

4. **Check if log files exist:**
   ```bash
   ls -la logs/
   cat logs/combined.log
   ```

5. **Verify Loki is receiving logs:**
   ```bash
   curl http://localhost:3100/ready
   curl http://localhost:3100/metrics
   ```

### Logs in files but not in Grafana?

1. **Check Promtail is reading files:**
   ```bash
   docker logs bloomverd-promtail | grep "watching"
   ```

2. **Restart Promtail:**
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart promtail
   ```

### Grafana can't connect to Loki?

1. **Check datasource:**
   - Grafana → Configuration → Data Sources
   - Click **Loki**
   - Scroll down → **Save & Test**
   - Should say "Data source connected and labels found"

2. **Check Loki is accessible:**
   ```bash
   curl http://localhost:3100/loki/api/v1/labels
   ```

## Tips

1. **Use time range selector** to narrow down logs
2. **Click on a log line** to see full JSON details
3. **Use Live tail** button for real-time logs
4. **Create alerts** based on log patterns
5. **Save your queries** as favorites

## Advanced Queries

**Error rate by context:**
```
sum by (context) (rate({job="bloomverd-sms", level="error"}[5m]))
```

**95th percentile request duration:**
```
quantile_over_time(0.95, {job="bloomverd-sms", context="HTTP"} | json | unwrap duration[5m]))
```

**Most active users:**
```
topk(10, sum by (userId) (count_over_time({job="bloomverd-sms"}[1h] | json)))
```

**Errors grouped by type:**
```
sum by (name) (count_over_time({job="bloomverd-sms", level="error"}[1h] | json))
```

Enjoy log exploration! 🔍📊
