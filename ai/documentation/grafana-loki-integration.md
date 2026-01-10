# Grafana Loki Integration for Log Viewing

**Date:** 2026-01-10  
**Purpose:** Enable log viewing and querying in Grafana using Loki and Promtail

## Overview

Loki is a log aggregation system designed to work with Grafana. It allows you to:
- Query logs using LogQL (similar to PromQL)
- View logs in real-time
- Create alerts based on log patterns
- Correlate logs with metrics
- Search across all application logs

## Architecture

```
┌──────────────────────────────────────────┐
│   NestJS App                             │
│   - AppLoggerService (Winston)          │
│   - Writes to logs/*.log files          │
└─────────────────┬────────────────────────┘
                  │
                  ▼ (writes JSON logs)
┌──────────────────────────────────────────┐
│   Log Files                              │
│   - logs/combined.log (all logs)         │
│   - logs/error.log (errors only)         │
└─────────────────┬────────────────────────┘
                  │
                  ▼ (reads files)
┌──────────────────────────────────────────┐
│   Promtail                               │
│   - Reads log files                      │
│   - Parses JSON                          │
│   - Adds labels                          │
│   - Ships to Loki                        │
└─────────────────┬────────────────────────┘
                  │
                  ▼ (HTTP push)
┌──────────────────────────────────────────┐
│   Loki                                   │
│   - Stores logs with labels              │
│   - Indexes for fast queries             │
│   - Provides query API                   │
└─────────────────┬────────────────────────┘
                  │
                  ▼ (queries)
┌──────────────────────────────────────────┐
│   Grafana                                │
│   - Visualizes logs                      │
│   - LogQL queries                        │
│   - Log dashboards                       │
│   - Alerts                               │
└──────────────────────────────────────────┘
```

## Components

### 1. Loki

**What it does:**
- Stores log data efficiently
- Indexes logs by labels (not full text)
- Provides HTTP API for queries
- Similar to Prometheus but for logs

**Configuration:** `monitoring/loki-config.yml`

**Port:** 3100

**Storage:** `loki-data` volume (persisted)

---

### 2. Promtail

**What it does:**
- Tail log files (similar to `tail -f`)
- Parse JSON logs
- Extract fields as labels
- Push logs to Loki

**Configuration:** `monitoring/promtail-config.yml`

**How it works:**
```yaml
scrape_configs:
  - job_name: bloomverd-combined
    static_configs:
      - labels:
          job: bloomverd-sms
          env: development
          log_type: combined
        __path__: /var/log/bloomverd/combined.log
    pipeline_stages:
      # 1. Parse JSON
      - json:
          expressions:
            level: level
            message: message
            context: context
      # 2. Extract timestamp
      - timestamp:
          source: timestamp
      # 3. Add as labels
      - labels:
          level:
          context:
```

---

### 3. Grafana Loki Datasource

**Auto-configured in:** `monitoring/grafana/provisioning/datasources/loki.yml`

**Connection:** http://loki:3100

**Labels indexed:**
- `job` - Always "bloomverd-sms"
- `env` - Environment (development, production)
- `log_type` - Type of log file (combined, error)
- `level` - Log level (info, warn, error, debug)
- `context` - Log context (HTTP, GraphQL, Database, Auth, etc.)
- `service` - Service name
- `name` - Error name (for errors)

---

## Log Dashboard

**File:** `monitoring/grafana/dashboards/bloomverd-logs.json`

### Panels

1. **Log Volume by Level**
   - Shows logs/minute for each level (info, warn, error)
   - Helps identify spikes in logging

2. **Error Rate**
   - Errors per second over time
   - Critical for monitoring application health

3. **Recent Error Logs**
   - Live view of error logs
   - Click to see full details

4. **Logs by Context**
   - Distribution of logs across contexts
   - See which parts of app are most active

5. **Warning Logs**
   - Recent warnings
   - Potential issues to investigate

6. **HTTP Request Logs**
   - All HTTP requests
   - Filter by status code, user, etc.

7. **GraphQL Operation Logs**
   - GraphQL queries and mutations
   - See operation names, variables

8. **Authentication Logs**
   - Login/logout events
   - Failed authentication attempts

9. **Database Logs**
   - Database queries
   - Slow query warnings

---

## LogQL Query Language

LogQL is similar to PromQL but for logs.

### Basic Syntax

```
{label="value"}
```

### Examples

**All logs:**
```
{job="bloomverd-sms"}
```

**Errors only:**
```
{job="bloomverd-sms", level="error"}
```

**Multiple labels:**
```
{job="bloomverd-sms", level="error", context="Database"}
```

### Filters

**Contains text:**
```
{job="bloomverd-sms"} |= "user-123"
```

**Doesn't contain:**
```
{job="bloomverd-sms"} != "health check"
```

**Regex match:**
```
{job="bloomverd-sms"} |~ "error|failed|exception"
```

**Regex doesn't match:**
```
{job="bloomverd-sms"} !~ "info|debug"
```

**Case insensitive:**
```
{job="bloomverd-sms"} |= `(?i)error`
```

### JSON Parsing

**Parse JSON and use fields:**
```
{job="bloomverd-sms"} | json
```

**Filter by JSON field:**
```
{job="bloomverd-sms"} | json | userId="user-123"
```

**Filter by numeric field:**
```
{job="bloomverd-sms", context="HTTP"} | json | statusCode >= 400
```

**Extract specific field:**
```
{job="bloomverd-sms"} | json | line_format "{{.message}}"
```

### Aggregations

**Count logs per minute:**
```
sum(count_over_time({job="bloomverd-sms"}[1m]))
```

**Error rate:**
```
sum(rate({job="bloomverd-sms", level="error"}[5m]))
```

**Logs by label:**
```
sum by (context) (count_over_time({job="bloomverd-sms"}[5m]))
```

**Top 10 error messages:**
```
topk(10, sum by (message) (count_over_time({job="bloomverd-sms", level="error"}[1h] | json)))
```

**Unique user count:**
```
count(count_over_time({job="bloomverd-sms"} | json | userId != "" [1h]) by (userId))
```

### Advanced

**95th percentile duration:**
```
quantile_over_time(0.95, {job="bloomverd-sms", context="HTTP"} | json | unwrap duration [5m])
```

**Average response time:**
```
avg_over_time({job="bloomverd-sms", context="HTTP"} | json | unwrap duration [5m])
```

**Bytes processed:**
```
sum(bytes_over_time({job="bloomverd-sms"}[1m]))
```

---

## Common Use Cases

### 1. Find All Errors for a User

```
{job="bloomverd-sms", level="error"} | json | userId="user-123"
```

### 2. Find Slow Requests

```
{job="bloomverd-sms", context="HTTP"} | json | duration > 1000
```

### 3. Find Failed Logins

```
{job="bloomverd-sms", context="Auth"} |= "login_failed"
```

### 4. Find Database Errors

```
{job="bloomverd-sms", context="Database", level="error"}
```

### 5. Find Specific Error Type

```
{job="bloomverd-sms", level="error"} | json | name="ValidationError"
```

### 6. Track API Endpoint Usage

```
sum by (url) (count_over_time({job="bloomverd-sms", context="HTTP"}[1h] | json))
```

### 7. Monitor Error Spike

```
sum(rate({job="bloomverd-sms", level="error"}[5m])) > 0.1
```

### 8. Find Requests from Specific IP

```
{job="bloomverd-sms", context="HTTP"} | json | ip="192.168.1.100"
```

---

## Creating Alerts

### In Grafana

1. Go to **Alerting** → **Alert rules**
2. Click **New alert rule**
3. Configure:
   - **Name:** High Error Rate
   - **Query:**
     ```
     sum(rate({job="bloomverd-sms", level="error"}[5m]))
     ```
   - **Condition:** `WHEN last() OF query() IS ABOVE 0.1`
   - **For:** 5 minutes
4. Add notification channel (Slack, email, etc.)
5. Save

### Example Alerts

**High Error Rate:**
```
sum(rate({job="bloomverd-sms", level="error"}[5m])) > 0.1
```

**Failed Logins Spike:**
```
sum(rate({job="bloomverd-sms", context="Auth"} |= "login_failed" [5m])) > 0.5
```

**Database Errors:**
```
count_over_time({job="bloomverd-sms", context="Database", level="error"}[5m]) > 0
```

**No Logs (service down):**
```
absent_over_time({job="bloomverd-sms"}[5m])
```

---

## Performance Considerations

### Labels vs Full-Text Search

Loki is optimized for **label-based queries**, not full-text search.

**✅ Good (indexed labels):**
```
{job="bloomverd-sms", level="error", context="HTTP"}
```

**❌ Slow (full-text search):**
```
{job="bloomverd-sms"} |= "some random text"
```

**Tip:** Extract important fields as labels in Promtail config.

### Time Ranges

Narrow time ranges are faster:

**✅ Fast:**
```
{job="bloomverd-sms", level="error"} [Last 15 minutes]
```

**❌ Slow:**
```
{job="bloomverd-sms", level="error"} [Last 30 days]
```

### Limit Results

Use `limit` to reduce data:

```
{job="bloomverd-sms", level="error"} | limit 100
```

---

## Data Retention

Default retention: **Unlimited** (until disk full)

### Configure Retention

Add to `loki-config.yml`:

```yaml
limits_config:
  retention_period: 168h  # 7 days
```

Restart Loki:
```bash
docker-compose -f docker-compose.monitoring.yml restart loki
```

---

## Troubleshooting

### Promtail not shipping logs

**Check Promtail logs:**
```bash
docker logs bloomverd-promtail
```

**Look for:**
```
level=info msg="Starting Promtail"
level=info msg="watching new target" labels="{job=\"bloomverd-sms\"}"
```

**Check positions file:**
```bash
docker exec bloomverd-promtail cat /tmp/positions.yaml
```

### Loki not receiving logs

**Check Loki is healthy:**
```bash
curl http://localhost:3100/ready
curl http://localhost:3100/metrics | grep loki_ingester_streams_created_total
```

**Check Loki logs:**
```bash
docker logs bloomverd-loki
```

### Grafana can't query Loki

**Test datasource:**
1. Grafana → Configuration → Data Sources
2. Click **Loki**
3. Scroll down → **Save & Test**

**Manual test:**
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="bloomverd-sms"}' \
  --data-urlencode 'limit=10' | jq
```

### Missing labels

**Check Promtail pipeline:**
- Ensure JSON parsing is working
- Verify labels are extracted
- Check for typos in field names

**Test locally:**
```bash
cat logs/combined.log | jq '.'
```

---

## Comparison: Loki vs ELK

| Feature | Loki | ELK |
|---------|------|-----|
| **Setup** | Simple (2 components) | Complex (3+ components) |
| **Resource Usage** | Low | High |
| **Indexing** | Labels only | Full-text |
| **Search Speed** | Fast (labels) | Fast (full-text) |
| **Storage** | Efficient | More storage |
| **Grafana Integration** | Native | Plugin |
| **Cost** | Free, lightweight | Higher resources |

**When to use Loki:**
- Already using Grafana
- Want simple setup
- Cost-sensitive
- Label-based queries sufficient

**When to use ELK:**
- Need full-text search
- Complex log parsing
- Existing ELK expertise
- Advanced analytics

---

## Summary

✅ **Loki** - Log aggregation system
✅ **Promtail** - Reads logs from files, ships to Loki
✅ **Grafana** - Visualizes logs, runs LogQL queries
✅ **Log Dashboard** - Pre-built dashboard with 9 panels
✅ **LogQL** - Query language for filtering and aggregating logs
✅ **Alerts** - Set up alerts on log patterns
✅ **Integration** - Seamlessly integrates with existing Prometheus/Grafana setup

Your logs are now fully queryable and visualizable in Grafana! 🎉📊🔍
