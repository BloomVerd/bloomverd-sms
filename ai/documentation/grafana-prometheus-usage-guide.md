# Grafana & Prometheus Usage Guide

**Date:** 2026-01-10  
**Purpose:** Complete guide for using Grafana and Prometheus dashboards for monitoring Bloomverd SMS backend

## Table of Contents

1. [Quick Start](#quick-start)
2. [Grafana Dashboard Guide](#grafana-dashboard-guide)
3. [Prometheus Dashboard Guide](#prometheus-dashboard-guide)
4. [Practical Workflows](#practical-workflows)
5. [Generating Test Data](#generating-test-data)
6. [Advanced Features](#advanced-features)
7. [Daily Usage Tips](#daily-usage-tips)

---

## Quick Start

### Access URLs

- **Grafana:** http://localhost:3001
  - Username: `admin`
  - Password: `admin`
- **Prometheus:** http://localhost:9090
- **Metrics Endpoint:** http://localhost:3000/metrics

### First Login

1. Go to http://localhost:3001
2. Login with `admin` / `admin`
3. Grafana will prompt you to change the password
   - Change it (recommended for production)
   - Skip (fine for local development)
4. Click **"Dashboards"** in the left sidebar
5. Open **"Bloomverd SMS - API Monitoring"**

---

## Grafana Dashboard Guide

### Dashboard Overview

Your dashboard contains **10 panels** tracking different aspects of your application. Each panel provides specific insights into performance, errors, and resource usage.

---

### Panel 1: HTTP Requests Per Second

**What it shows:** Rate of HTTP requests hitting your API endpoints

**How to read:**
- **Y-axis:** Requests per second
- **X-axis:** Time
- **Each line:** Different endpoint (colored by method and path)
- **Higher lines:** More traffic to that endpoint
- **Spikes:** Sudden increase in traffic (could be normal or an attack)

**Metrics used:**
```promql
rate(http_requests_total[5m])
```

**Use cases:**
- Identify your busiest endpoints
- Detect traffic patterns (peak hours)
- Spot unusual traffic spikes
- Monitor API usage growth

**What to watch for:**
- ✅ Steady traffic patterns during business hours
- ⚠️ Unexpected spikes (check for attacks or viral content)
- ❌ Sudden drops to zero (service down)

**Example interpretation:**
```
If you see:
- /api/users endpoint: 50 req/s
- /api/auth/login endpoint: 10 req/s
- /api/students endpoint: 100 req/s

→ Students endpoint is your highest traffic endpoint
→ Consider caching or optimization for it
```

---

### Panel 2: HTTP Request Duration (95th percentile)

**What it shows:** How long 95% of HTTP requests take to complete

**How to read:**
- **Y-axis:** Duration in seconds
- **Lower is better** (faster response times)
- **p95 means:** 95% of requests complete faster than this value
- **Different lines:** Different endpoints

**Metrics used:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Use cases:**
- Find slow endpoints that need optimization
- Set SLA targets (e.g., "p95 should be < 500ms")
- Compare performance before/after code changes
- Identify performance degradation over time

**What to watch for:**
- ✅ Most endpoints under 1 second
- ⚠️ Gradual increases over time (memory leak or growing data)
- ❌ Sudden spikes (database issues, external API delays)

**Example interpretation:**
```
If /api/students shows 2.5 seconds at p95:
→ 5% of requests take longer than 2.5s
→ This endpoint needs optimization
→ Check database queries, add indexes, or implement caching
```

**Why p95 instead of average:**
- Average can hide outliers
- p95 shows what most users experience
- Industry standard for SLAs

---

### Panel 3: GraphQL Queries Per Second

**What it shows:** Rate of GraphQL queries and mutations being executed

**How to read:**
- **Y-axis:** Queries per second
- **Each line:** Different GraphQL operation (query/mutation name)
- **Color-coded:** By operation name

**Metrics used:**
```promql
rate(graphql_queries_total[5m])
```

**Use cases:**
- Identify most-used GraphQL operations
- Understand user behavior
- Plan for scaling specific resolvers
- Detect unusual query patterns

**What to watch for:**
- ✅ Normal distribution of queries based on app features
- ⚠️ One query dominating (might need optimization)
- ❌ Unexpected queries (possible introspection attacks)

**Example interpretation:**
```
If you see:
- getUserById: 200 req/s
- listStudents: 50 req/s
- createStudent: 5 req/s

→ Read-heavy workload (typical for most apps)
→ getUserById needs caching strategy
→ Write operations are much less frequent
```

---

### Panel 4: GraphQL Query Duration (95th percentile)

**What it shows:** How long GraphQL operations take to complete (95th percentile)

**How to read:**
- **Y-axis:** Duration in seconds
- **Each line:** Different GraphQL operation
- **Focus on:** Slowest operations

**Metrics used:**
```promql
histogram_quantile(0.95, rate(graphql_query_duration_seconds_bucket[5m]))
```

**Use cases:**
- Identify slow GraphQL resolvers
- Prioritize optimization efforts
- Monitor N+1 query problems
- Track resolver performance improvements

**What to watch for:**
- ✅ Most queries under 500ms
- ⚠️ Complex queries taking 1-2s (consider splitting or caching)
- ❌ Any query over 5s (immediate optimization needed)

**Common causes of slow queries:**
```
1. N+1 problem → Use DataLoader
2. Missing database indexes → Add indexes
3. Over-fetching data → Optimize resolver
4. No pagination → Add pagination
5. Complex joins → Denormalize or cache
```

**Example optimization:**
```
Before: listStudentsWithClasses = 3.2s at p95
After adding DataLoader: 0.4s at p95
→ 8x performance improvement!
```

---

### Panel 5: GraphQL Error Rate

**What it shows:** Errors occurring in GraphQL operations over time

**How to read:**
- **Y-axis:** Errors per second
- **Any line above 0:** Errors are occurring
- **Labeled by:** Operation name and error type
- **Higher is worse**

**Metrics used:**
```promql
rate(graphql_errors_total[5m])
```

**Use cases:**
- Spot and diagnose issues quickly
- Monitor error rates after deployments
- Set up alerting for critical errors
- Track error reduction efforts

**What to watch for:**
- ✅ Zero or near-zero error rate
- ⚠️ Occasional errors (validation, user errors)
- ❌ Sustained error rate (broken deployment, database down)

**Error types you might see:**
```
- ValidationError → User input issues (normal, expected)
- AuthenticationError → Invalid tokens (could be attack)
- DatabaseError → Database connection issues (critical)
- TimeoutError → External service delays (investigate)
- UnknownError → Uncaught exceptions (bug in code)
```

**⚠️ ALERT SETUP:**
```
Set alert if error rate > 1% of total queries
→ Indicates serious problem
→ Page on-call engineer
```

**Example investigation:**
```
See spike in ValidationError for "createStudent":
1. Check what changed in validation logic
2. Review recent user reports
3. Look at actual error messages in logs
4. Fix validation or improve error messages
```

---

### Panel 6: Database Queries Per Second

**What it shows:** Rate of database queries by type (SELECT, INSERT, UPDATE, DELETE)

**How to read:**
- **Y-axis:** Queries per second
- **Each line:** Different query type
- **Color-coded:** By operation (SELECT, INSERT, UPDATE, DELETE)

**Metrics used:**
```promql
rate(db_queries_total[5m])
```

**Use cases:**
- Database load analysis
- Understand read vs write ratio
- Capacity planning for database
- Detect unusual query patterns

**What to watch for:**
- ✅ Read-heavy workload (typical: 80% SELECT, 20% writes)
- ⚠️ High UPDATE rate (might indicate hot updates)
- ❌ Sustained high query rate (may need read replicas)

**Typical ratios:**
```
Healthy app:
- SELECT: 1000 qps (80%)
- INSERT: 100 qps (8%)
- UPDATE: 100 qps (8%)
- DELETE: 50 qps (4%)

Write-heavy app (e.g., logging system):
- SELECT: 100 qps (20%)
- INSERT: 400 qps (80%)
```

**Scaling decisions:**
```
High SELECT rate → Add read replicas or caching
High INSERT rate → Batch inserts, queue writes
High UPDATE rate → Check for hot rows, add sharding
High DELETE rate → Consider soft deletes or archiving
```

---

### Panel 7: Authentication Success vs Failures

**What it shows:** Login attempts - successful vs failed

**How to read:**
- **Green line:** Successful authentications
- **Red line:** Failed authentication attempts
- **Y-axis:** Attempts per second

**Metrics used:**
```promql
rate(authentication_attempts_total[5m])  # Success
rate(authentication_failures_total[5m])  # Failures
```

**Use cases:**
- Security monitoring
- Detect brute force attacks
- Identify UX issues (users can't login)
- Monitor authentication system health

**What to watch for:**
- ✅ Success rate >> failure rate (normal user behavior)
- ⚠️ High failure rate (UX issue or forgotten passwords)
- ❌ Extreme failure rate spikes (brute force attack)

**Normal vs Attack:**
```
Normal:
- Success: 10 attempts/s
- Failures: 1 attempt/s (10% failure rate)
→ Typical forgotten passwords

Brute Force Attack:
- Success: 0 attempts/s
- Failures: 1000 attempts/s
→ Someone trying many password combinations
→ IMMEDIATE ACTION: Rate limiting, IP blocking, alerts
```

**Security best practices:**
```
1. Failure rate > 20% → Investigate UX or show better error messages
2. Failure rate > 100/s from same IP → Rate limit that IP
3. Sustained high failures → Enable CAPTCHA
4. Pattern of failures across many accounts → Credential stuffing attack
```

**⚠️ ALERT SETUP:**
```
Alert if failure rate > 100/s for 1 minute
→ Likely automated attack
→ Auto-enable additional security measures
```

---

### Panel 8: Memory Usage

**What it shows:** Node.js heap memory usage

**How to read:**
- **Blue line:** Heap Used (actual memory in use)
- **Orange line:** Heap Total (allocated memory)
- **Y-axis:** Bytes (will show as MB/GB)
- **Heap Used should always be < Heap Total**

**Metrics used:**
```promql
nodejs_heap_size_used_bytes  # Memory in use
nodejs_heap_size_total_bytes # Total allocated
```

**Use cases:**
- Resource monitoring
- Detect memory leaks
- Capacity planning
- Determine when to scale up

**What to watch for:**
- ✅ Sawtooth pattern (garbage collection working)
- ⚠️ Steady increase (possible memory leak)
- ❌ Used approaching Total (out of memory imminent)

**Memory patterns explained:**
```
Healthy (Sawtooth):
Memory used increases, then drops sharply when GC runs
     /\      /\      /\
    /  \    /  \    /  \
   /    \  /    \  /    \
  /      \/      \/      \
→ Normal garbage collection

Memory Leak:
Memory keeps increasing, never fully drops
         /
        /
       /
      /
     /
    /
   /
  /
→ Objects not being released, INVESTIGATE!

Out of Memory:
Used memory reaches Total, then crashes
         ___TOTAL___
        /
       /
      /  💥 CRASH
     /
```

**Investigation steps for memory leaks:**
```
1. Take heap snapshot in Chrome DevTools
2. Look for objects growing over time
3. Common causes:
   - Event listeners not removed
   - Global variables accumulating data
   - Circular references
   - Caching without expiration
   - Database connection leaks
```

**⚠️ ALERT SETUP:**
```
Alert if (used / total) > 0.85 for 5 minutes
→ Running out of memory
→ Restart service or add more memory
```

---

### Panel 9: CPU Usage

**What it shows:** CPU consumption by Node.js process

**How to read:**
- **User CPU:** Time spent executing your code
- **System CPU:** Time spent in system calls
- **Y-axis:** Percentage (0-100%)
- **Total CPU = User + System**

**Metrics used:**
```promql
rate(process_cpu_user_seconds_total[5m])    # User CPU
rate(process_cpu_system_seconds_total[5m])  # System CPU
```

**Use cases:**
- Performance monitoring
- Detect CPU-intensive operations
- Capacity planning
- Identify bottlenecks

**What to watch for:**
- ✅ Low CPU during idle, spikes during traffic
- ⚠️ Sustained 60-80% (consider scaling)
- ❌ Constant 100% (bottleneck, need optimization)

**CPU patterns:**
```
Normal:
   ____        ____        ____
  /    \      /    \      /    \
_/      \____/      \____/      \___
→ CPU spikes with traffic, drops when idle

CPU Bound:
_________________________________
→ Constant high CPU, blocking event loop
→ Move heavy computation to workers

I/O Bound:
___  ___  ___  ___  ___  ___  ___
→ Short bursts, mostly waiting on I/O
→ Healthy for web apps
```

**High CPU causes:**
```
1. Complex algorithms → Optimize or move to worker threads
2. Large JSON parsing → Stream data instead
3. RegEx on large strings → Limit input size
4. Unoptimized loops → Use efficient data structures
5. Image/video processing → Use external service
```

**Optimization tips:**
```
If CPU > 80% sustained:
1. Profile with Node.js --prof
2. Find hotspots in code
3. Options:
   - Optimize algorithm
   - Add caching
   - Move to worker threads
   - Scale horizontally (add more instances)
```

---

### Panel 10: Event Loop Lag

**What it shows:** Node.js event loop delay/lag

**How to read:**
- **Y-axis:** Lag in seconds
- **Should be near 0** (ideally < 10ms)
- **Higher = worse** (event loop is blocked)

**Metrics used:**
```promql
nodejs_eventloop_lag_seconds
```

**Use cases:**
- Detect performance degradation
- Identify blocking operations
- Monitor application responsiveness
- Set performance baselines

**What to watch for:**
- ✅ Lag < 0.01s (10ms) - Excellent
- ⚠️ Lag 0.01-0.1s (10-100ms) - Acceptable
- ❌ Lag > 0.1s (100ms) - Poor, investigate immediately

**Why event loop lag matters:**
```
Node.js is single-threaded:
- All async operations share one event loop
- If loop is blocked, nothing else runs
- High lag = application feels "frozen"

Example:
Normal: Request → Response in 50ms
High lag (1s): Request → Wait 1s for event loop → Response in 1.05s
→ User experiences slow app even if logic is fast!
```

**Common causes of high lag:**
```
1. Synchronous operations
   ❌ fs.readFileSync() → Use fs.readFile()
   ❌ crypto.pbkdf2Sync() → Use crypto.pbkdf2()

2. CPU-intensive tasks
   ❌ Large JSON.parse() → Stream data
   ❌ Heavy computation in request → Move to worker

3. Blocking database queries
   ❌ Long-running queries in main thread
   → Use connection pools, optimize queries

4. Large loops
   ❌ for (let i = 0; i < 1000000; i++)
   → Break into smaller chunks with setImmediate()
```

**⚠️ CRITICAL ALERT:**
```
Alert if event loop lag > 1 second
→ Application is severely degraded
→ Users experiencing very slow responses
→ IMMEDIATE investigation needed
```

**How to fix high event loop lag:**
```
1. Profile with clinic.js or 0x
2. Identify blocking code
3. Solutions:
   - Make operations async
   - Use worker threads for heavy tasks
   - Optimize database queries
   - Add caching to reduce computation
   - Scale horizontally
```

---

## Key Grafana Features

### 1. Time Range Selector (Top Right)

Click the **clock icon** to change time range:

```
Quick ranges:
- Last 5 minutes → Live monitoring, troubleshooting
- Last 15 minutes → Recent activity
- Last 1 hour → Default, good for monitoring
- Last 6 hours → Half-day trends
- Last 24 hours → Daily patterns
- Last 7 days → Weekly trends
- Last 30 days → Monthly analysis

Custom range:
- From: 2026-01-01 00:00
- To: 2026-01-10 23:59
→ Analyze specific time period (e.g., during incident)
```

**Use cases:**
```
- Investigating incident: Set custom range to incident time
- Daily standup: Last 24 hours
- Weekly review: Last 7 days
- Capacity planning: Last 30 days
```

---

### 2. Auto Refresh (Top Right)

Click dropdown next to time range:

```
Refresh intervals:
- Off → Manual refresh only (save resources)
- 5s → Very frequent (live troubleshooting)
- 10s → Frequent (active monitoring)
- 30s → Moderate (general monitoring)
- 1m → Slow (background monitoring)
- 5m → Very slow (long-term trending)
```

**Best practices:**
```
Development: 10s (see changes immediately)
Production monitoring: 30s-1m (balance freshness vs load)
Incident response: 5s (real-time updates)
Historical analysis: Off (no need for updates)
```

---

### 3. Zoom and Navigation

**Zoom into specific time period:**
```
1. Click and drag horizontally on any graph
2. Selected area will zoom in
3. Double-click to zoom back out
```

**Pan through time:**
```
Hold Shift + click and drag left/right
→ Move through time without zooming
```

**Reset zoom:**
```
Double-click on graph
→ Returns to dashboard time range
```

---

### 4. Panel Menu (Click Panel Title)

Each panel has a menu with these options:

**View**
```
- Full screen → Expand panel to full screen
- Useful for presentations or deep analysis
- Press ESC to exit
```

**Inspect**
```
- Data → See raw data points
- Query → See PromQL query and explain
- Panel JSON → View/edit panel configuration
- Useful for debugging queries
```

**Share**
```
- Link → Get shareable URL
  - Current time range (default)
  - Shortened URL option
- Snapshot → Create static snapshot
  - Share without giving dashboard access
- Embed → Get iframe code
- Export → Download as PNG
```

**Explore**
```
Opens query in Explore view
→ Ad-hoc analysis with full PromQL editor
→ Can add multiple queries
→ See query history
```

**More options**
```
- Duplicate → Copy panel to modify
- Copy → Copy to another dashboard
- Create library panel → Reuse across dashboards
- Hide legend → More space for graph
```

---

### 5. Legend Interactions

At the bottom/side of each graph:

**Click legend item:**
```
→ Toggles that series on/off
Useful to focus on specific metrics
```

**Shift + Click legend:**
```
→ Isolates that series (hides all others)
Quick way to analyze one metric
```

**Hover over legend:**
```
→ Highlights that series on graph
Easier to track specific line
```

---

### 6. Variables & Filters (Top of Dashboard)

You can add variables to filter data:

**Example variables you might add:**
```
- Environment: dev, staging, production
- Service: api, workers, batch-jobs
- Endpoint: /api/users, /api/students
- Error Type: ValidationError, DatabaseError
```

**How to add:**
```
1. Dashboard settings (gear icon)
2. Variables
3. Add variable
4. Configure query to populate options
5. Use in panel queries: {endpoint="$endpoint"}
```

---

### 7. Annotations

Mark important events on graphs:

**Use cases:**
```
- Deployments
- Scaling events
- Incidents
- Configuration changes
```

**How to add:**
```
1. Dashboard settings → Annotations
2. Add annotation query
3. Will appear as vertical lines on all graphs
```

---

## Prometheus Dashboard Guide

### Accessing Prometheus

Go to: http://localhost:9090

### Main Tabs

#### 1. Graph Tab - Query Metrics

This is where you write PromQL queries and see results.

**Interface:**
```
[Query Box]
  ↓
[Execute] [Add Graph]
  ↓
[Graph View] [Table View]
```

**Try these queries:**

**1. See all HTTP requests:**
```promql
rate(http_requests_total[5m])
```
→ Shows request rate for all endpoints

**2. Find slowest GraphQL operations (p99):**
```promql
histogram_quantile(0.99, rate(graphql_query_duration_seconds_bucket[5m]))
```
→ 99th percentile latency by operation

**3. Total error rate:**
```promql
sum(rate(graphql_errors_total[5m]))
```
→ Combined error rate across all operations

**4. Memory usage percentage:**
```promql
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```
→ How full is the heap (0-100%)

**5. Top 5 busiest endpoints:**
```promql
topk(5, rate(http_requests_total[5m]))
```
→ Highest traffic endpoints

**6. Success rate:**
```promql
sum(rate(http_requests_total{status_code!~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```
→ Percentage of successful requests

**7. Database query distribution:**
```promql
sum by (query_type) (rate(db_queries_total[5m]))
```
→ Grouped by SELECT, INSERT, UPDATE, DELETE

**8. Error rate by type:**
```promql
sum by (error_type) (rate(graphql_errors_total[5m]))
```
→ See which errors are most common

---

#### 2. Alerts Tab

Shows configured alerts and their status.

**Alert states:**
```
- Inactive → Condition not met (good)
- Pending → Condition met, waiting for duration
- Firing → Alert is active, notifications sent
```

**Example alerts you should add:**

```yaml
# In prometheus.yml
rule_files:
  - /etc/prometheus/alerts.yml

# In alerts.yml:
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(graphql_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memory usage above 85%"

      # Slow response times
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency above 2 seconds"

      # High event loop lag
      - alert: HighEventLoopLag
        expr: nodejs_eventloop_lag_seconds > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Event loop lag above 1 second"
```

---

#### 3. Targets Tab

Shows all services Prometheus is scraping.

**What to check:**
```
Service: nestjs-app
State: UP ✅
  Last Scrape: 2s ago
  Scrape Duration: 45ms
  
→ Healthy!

State: DOWN ❌
  Error: connection refused
  
→ Check if app is running
→ Check firewall
→ Verify URL in prometheus.yml
```

**Target details:**
```
Click "show more" on a target:
- Endpoint: http://host.docker.internal:3000/metrics
- Labels: job="nestjs-app", service="bloomverd-sms-api"
- Last error: None
- Up time: 2h 45m
```

---

#### 4. Status Tab

System information and configuration.

**Useful sub-tabs:**

**Runtime & Build Information:**
```
- Prometheus version
- Uptime
- Storage info
```

**Configuration:**
```
View current prometheus.yml
→ Check scrape configs
→ Verify targets are correct
```

**Rules:**
```
See all alert rules
→ Check if alerts loaded correctly
```

**Targets:**
```
Same as Targets tab
```

**Service Discovery:**
```
See how Prometheus discovers services
```

---

### PromQL Basics

#### Rate Function
```promql
rate(metric_name[time_range])

Example:
rate(http_requests_total[5m])
→ Per-second average rate over last 5 minutes
```

#### Histogram Quantile
```promql
histogram_quantile(percentile, rate(metric_bucket[time_range]))

Example:
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
→ 95th percentile latency
```

#### Aggregation
```promql
sum(metric)              → Total
avg(metric)              → Average
min(metric)              → Minimum
max(metric)              → Maximum
count(metric)            → Count

With grouping:
sum by (label) (metric)  → Sum grouped by label
```

#### Filters
```promql
metric{label="value"}                    → Exact match
metric{label!="value"}                   → Not equal
metric{label=~"regex"}                   → Regex match
metric{label!~"regex"}                   → Regex not match

Example:
http_requests_total{path="/api/users", method="GET"}
```

#### Math Operations
```promql
metric1 + metric2        → Addition
metric1 - metric2        → Subtraction
metric1 * metric2        → Multiplication
metric1 / metric2        → Division

Example:
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
→ Memory usage percentage
```

---

## Practical Workflows

### Scenario 1: Monitor Live Traffic

**Goal:** Watch metrics update in real-time

**Steps:**
```
1. Open Grafana: http://localhost:3001
2. Open "Bloomverd SMS - API Monitoring" dashboard
3. Set time range: "Last 5 minutes"
4. Enable auto-refresh: "10s"
5. Make API requests to your app
6. Watch panels update live!
```

**What to observe:**
```
- Panel 1: HTTP request count increases
- Panel 2: See request durations
- Panel 3: GraphQL queries appear
- Panel 8: Memory usage changes
- Panel 9: CPU spikes with activity
```

**Tip:** Open on second monitor while developing

---

### Scenario 2: Investigate Slow Performance

**Symptoms:**
```
Users reporting: "App is slow"
```

**Investigation steps:**

**Step 1: Check overall latency**
```
1. Open Panel 2 (HTTP Duration) or Panel 4 (GraphQL Duration)
2. Look for elevated lines
3. Identify which endpoint/operation is slow
```

**Step 2: Drill down in Prometheus**
```
1. Go to Prometheus: http://localhost:9090
2. Query specific endpoint:
   histogram_quantile(0.99, rate(graphql_query_duration_seconds_bucket{operation="yourSlowOperation"}[5m]))
3. See exact p99 latency
```

**Step 3: Correlate with resources**
```
Check Panel 8 (Memory):
- High memory? → Possible memory leak
- Sawtooth pattern? → Frequent GC pauses

Check Panel 10 (Event Loop Lag):
- High lag? → Blocking operations

Check Panel 6 (Database):
- High query rate? → Database bottleneck
```

**Step 4: Use Explore for detailed analysis**
```
1. Click Panel 4 title → Explore
2. Add multiple queries to compare:
   - Query duration
   - Memory usage
   - Database queries
   - Error rate
3. Find correlation
```

**Example findings:**
```
Slow endpoint: listStudentsWithClasses (2.5s p95)

Correlation:
- Database queries spike during this operation
- No increase in memory or CPU
- No event loop lag

→ Conclusion: Database N+1 problem
→ Solution: Implement DataLoader
```

---

### Scenario 3: Detect and Diagnose Errors

**Symptoms:**
```
Monitoring alert: "High GraphQL error rate"
```

**Investigation steps:**

**Step 1: Identify error spike**
```
1. Open Panel 5 (GraphQL Error Rate)
2. See which operation has errors
3. Note the time range
```

**Step 2: Query error details in Prometheus**
```
1. Go to Prometheus
2. Query errors by type:
   sum by (error_type, operation) (rate(graphql_errors_total[5m]))
3. Identify error type (e.g., ValidationError, DatabaseError)
```

**Step 3: Check application logs**
```
1. Filter logs by time range and operation
2. See actual error messages
3. Identify root cause
```

**Step 4: Correlate with deployments**
```
Check if error spike correlates with:
- Recent deployment (check git commits)
- Infrastructure change
- Traffic spike
```

**Example investigation:**
```
Panel 5 shows spike at 14:30:

Prometheus query:
graphql_errors_total{operation="createStudent"}
→ All errors are "ValidationError"

Check logs:
→ "email field is required" errors

Git log:
→ Deployment at 14:25 made email required

Action:
→ Hotfix: Make email optional with default
→ Or: Update frontend to include email
```

---

### Scenario 4: Capacity Planning

**Goal:** Determine if you need to scale

**Steps:**

**Step 1: Analyze resource trends (7-day view)**
```
1. Set time range: "Last 7 days"
2. Look at Panel 8 (Memory) and Panel 9 (CPU)
3. Identify peak usage periods
```

**Step 2: Calculate headroom**
```
Memory:
- Peak usage: 1.2 GB
- Total available: 2 GB
- Headroom: 40%
→ OK for now

CPU:
- Peak usage: 85%
- Target max: 70%
- Headroom: -15%
→ Need to scale!
```

**Step 3: Project growth**
```
1. Look at Panel 1 (HTTP requests) over 30 days
2. Calculate growth rate:
   (Current rate - 30 days ago) / 30 days ago
3. Project when resources will be exhausted
```

**Step 4: Make scaling decision**
```
Current: 1000 req/s at 85% CPU

Options:
A. Vertical scaling (bigger instance)
   → 2x CPU cores
   → Can handle ~2000 req/s
   
B. Horizontal scaling (more instances)
   → 2 instances
   → Can handle ~2000 req/s
   → Better for HA
   
C. Optimization first
   → Cache frequently accessed data
   → Optimize slow queries
   → May reduce CPU by 30%
   → Can handle ~1400 req/s

Recommendation: B or C+B
```

---

### Scenario 5: Deployment Validation

**Goal:** Ensure deployment didn't introduce issues

**Before deployment:**
```
1. Note current metrics:
   - Error rate: 0.01%
   - p95 latency: 250ms
   - Memory usage: 800MB
   - CPU: 45%
2. Take screenshot or note time
```

**After deployment:**
```
1. Set time range to show "before" and "after"
2. Compare all panels
```

**What to check:**
```
✅ Error rate unchanged or lower
✅ Latency unchanged or lower
✅ Memory usage stable (not increasing)
✅ CPU usage stable
✅ No new errors appearing in Panel 5

⚠️ Slight increase in any metric
   → Monitor for 30 minutes
   → Revert if degrades further

❌ Significant increase in errors/latency
   → Immediate rollback
```

**Create comparison in Grafana:**
```
1. Duplicate dashboard
2. First row: Before deployment (time range: before)
3. Second row: After deployment (time range: after)
4. Side-by-side comparison
```

---

## Generating Test Data

To see metrics populate in your dashboards, you need to generate traffic.

### Method 1: Use Test Script

I've created a script for you:

```bash
# Make it executable (first time only)
chmod +x ./scripts/generate-test-traffic.sh

# Run it
./scripts/generate-test-traffic.sh
```

**What it does:**
```
- Makes 50 GraphQL requests
- 100ms delay between requests
- Populates metrics in ~5 seconds
- Results visible in Grafana within 15 seconds
```

### Method 2: Manual Requests

**GraphQL introspection query:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}'
```

**Your actual queries (customize):**
```bash
# List students
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ students { id name } }"}'

# Get student by ID
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ student(id: 1) { id name email } }"}'
```

### Method 3: Load Testing (Advanced)

For realistic traffic simulation:

**Install k6 (load testing tool):**
```bash
brew install k6  # macOS
# or download from https://k6.io
```

**Create load test:**
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,        // 10 virtual users
  duration: '30s', // Run for 30 seconds
};

export default function () {
  const url = 'http://localhost:3000/graphql';
  const payload = JSON.stringify({
    query: '{ __schema { queryType { name } } }',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

**Run load test:**
```bash
k6 run load-test.js
```

**Watch metrics:**
```
Open Grafana while load test runs
→ See all panels light up with data!
```

---

## Advanced Features

### 1. Creating Custom Panels

**Add a new panel:**
```
1. Click "Add panel" button (top right)
2. Click "Add a new panel"
3. Configure:
   - Visualization type (Graph, Gauge, Stat, Table, etc.)
   - Query (PromQL)
   - Panel title
   - Axes labels
   - Legend format
4. Click "Apply"
5. Save dashboard
```

**Example: Create "Top 5 Slowest Operations" panel**
```
1. Add new panel
2. Query:
   topk(5, histogram_quantile(0.95, rate(graphql_query_duration_seconds_bucket[5m])))
3. Visualization: Bar chart
4. Title: "Top 5 Slowest Operations (p95)"
5. Apply & Save
```

### 2. Templating / Variables

**Create a variable:**
```
1. Dashboard settings (gear icon)
2. Variables → Add variable
3. Configure:
   Name: environment
   Type: Query
   Query: label_values(http_requests_total, environment)
4. Save
```

**Use in panels:**
```
Query:
rate(http_requests_total{environment="$environment"}[5m])

→ Dashboard shows dropdown at top
→ Select environment to filter all panels
```

**Common variables:**
```
- $environment (dev, staging, prod)
- $service (api, workers, batch)
- $endpoint (specific API paths)
- $interval (time bucket for aggregation)
```

### 3. Alerting in Grafana

**Create an alert:**
```
1. Edit a panel
2. Alert tab
3. Create Alert
4. Configure:
   - Condition: WHEN avg() OF query(A, 5m, now) IS ABOVE 0.1
   - Evaluate every: 1m
   - For: 5m (wait 5 min before alerting)
5. Add notification channel (email, Slack, etc.)
```

**Example alert:**
```
Panel: GraphQL Error Rate
Alert: WHEN avg() IS ABOVE 0.1
For: 5 minutes
Message: "High error rate detected: {{ $value }} errors/sec"
Send to: #alerts Slack channel
```

### 4. Annotations

**Mark deployments on graphs:**
```
1. Dashboard settings → Annotations
2. Add annotation
3. Type: Query
4. Data source: Prometheus
5. Query: deployment_timestamp
6. Save
```

**Result:**
```
Vertical lines on graphs at deployment times
→ Correlate performance changes with deployments
```

### 5. Playlist Mode

**Create a playlist:**
```
1. Dashboards → Playlists
2. Create playlist
3. Add dashboards
4. Set interval (e.g., 10 seconds per dashboard)
5. Start playlist
```

**Use case:**
```
Display on TV in office
→ Rotates through dashboards
→ Team sees key metrics
```

### 6. Snapshots

**Share a moment in time:**
```
1. Click share icon (top right)
2. Snapshot tab
3. Set expiration (or never)
4. Publish to snapshots.raintank.io
5. Share URL
```

**Use case:**
```
Share incident state with team
→ Exact metrics at time of incident
→ No access to live dashboard needed
```

### 7. Export / Import Dashboards

**Export:**
```
Dashboard settings → JSON Model
→ Copy JSON
→ Save to file
→ Commit to git for version control
```

**Import:**
```
Create → Import
→ Upload JSON file
→ Dashboard recreated exactly
```

---

## Daily Usage Tips

### 1. Morning Routine

```
✅ Open Grafana dashboard
✅ Set time range: "Last 24 hours"
✅ Check for anomalies:
   - Error rate spikes
   - Performance degradation
   - Resource usage trends
✅ Review any alerts that fired
✅ Plan optimization tasks
```

### 2. During Development

```
✅ Keep dashboard open on second monitor
✅ Auto-refresh: 10s
✅ Time range: "Last 5 minutes"
✅ Make code change
✅ See immediate impact on metrics
✅ Iterate quickly
```

### 3. Before Deployment

```
✅ Note current metrics (screenshot or note time)
✅ Set up alert rules
✅ Prepare rollback plan
✅ Monitor dashboard during deployment
✅ Compare before/after metrics
```

### 4. Incident Response

```
✅ Set time range to incident time
✅ Check all panels for anomalies
✅ Use Explore for deep dive
✅ Correlate metrics with logs
✅ Share snapshot with team
✅ Create post-mortem report
```

### 5. Weekly Review

```
✅ Set time range: "Last 7 days"
✅ Analyze trends:
   - Traffic growth
   - Error patterns
   - Performance trends
   - Resource usage
✅ Plan capacity scaling
✅ Prioritize optimizations
```

### 6. Monthly Planning

```
✅ Set time range: "Last 30 days"
✅ Export metrics to CSV
✅ Create executive summary:
   - Uptime %
   - Average response time
   - Error rate
   - Traffic growth
✅ ROI on infrastructure
✅ Budget for next month
```

---

## Keyboard Shortcuts

### Grafana Shortcuts

```
?             → Show keyboard shortcuts
d + k         → Open dashboard search
d + h         → Go to home dashboard
ESC           → Exit panel fullscreen
s             → Share current dashboard
```

### Prometheus Shortcuts

```
Ctrl/Cmd + Enter   → Execute query
Ctrl/Cmd + Space   → Autocomplete
Tab                → Next completion
Shift + Tab        → Previous completion
```

---

## Best Practices

### Dashboard Design

```
✅ Group related panels
✅ Use consistent colors across dashboards
✅ Add descriptions to panels (Edit → Panel Description)
✅ Set appropriate time ranges per panel
✅ Use variables for flexibility
❌ Don't overcrowd (max 12 panels per dashboard)
❌ Don't use too many colors (hard to read)
```

### Query Optimization

```
✅ Use appropriate time ranges ([5m] vs [1h])
✅ Aggregate where possible (sum, avg)
✅ Limit cardinality (don't use label with many values)
✅ Use recording rules for expensive queries
❌ Don't query too frequently (respect scrape interval)
❌ Don't create high-cardinality labels
```

### Alerting

```
✅ Alert on symptoms, not causes
✅ Use multiple severity levels
✅ Set appropriate thresholds
✅ Include context in alert messages
✅ Test alerts before production
❌ Don't alert on transient issues
❌ Don't create alert fatigue
```

### Performance

```
✅ Limit retention period (30 days default)
✅ Use recording rules for complex queries
✅ Archive old data to long-term storage
✅ Monitor Prometheus itself
❌ Don't store high-frequency metrics unnecessarily
❌ Don't use Prometheus for logs (use Loki instead)
```

---

## Troubleshooting

### No Data in Grafana

**Check 1: Is Prometheus receiving data?**
```
1. Go to Prometheus: http://localhost:9090/targets
2. Check if "nestjs-app" target is UP
3. If DOWN:
   - Is your NestJS app running?
   - Can you access http://localhost:3000/metrics?
   - Check Docker network
```

**Check 2: Is Grafana connected to Prometheus?**
```
1. Grafana → Configuration → Data Sources
2. Click Prometheus
3. Scroll down → Test
4. Should say "Data source is working"
```

**Check 3: Are queries correct?**
```
1. Edit panel
2. Check query
3. Try in Prometheus directly
4. Verify metric name exists
```

**Check 4: Time range**
```
Metrics may not exist for selected time range
→ Try "Last 5 minutes"
→ Generate test traffic
→ Wait 10-15 seconds
```

### Dashboard Not Loading

**Solution:**
```
1. Check browser console for errors
2. Clear browser cache
3. Check Grafana logs:
   docker logs bloomverd-grafana
4. Restart Grafana:
   docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Metrics Endpoint Error

**Error: Cannot access /metrics**
```
1. Check if app is running
2. Check if PrometheusModule is imported
3. Check if metrics interceptor is working:
   - Make a request
   - Check /metrics
   - Should see metrics increment
```

### Prometheus Not Scraping

**Check prometheus.yml:**
```
1. docker exec bloomverd-prometheus cat /etc/prometheus/prometheus.yml
2. Verify scrape_configs has your app
3. Verify target URL is correct
4. Check Prometheus logs:
   docker logs bloomverd-prometheus
```

### High Memory Usage

**Prometheus or Grafana using too much memory:**
```
1. Reduce retention period
2. Reduce scrape frequency
3. Limit metric cardinality
4. Use recording rules
```

---

## Next Steps

### Immediate (This Week)

```
1. ✅ Access both dashboards
2. ✅ Generate test traffic
3. ✅ Familiarize with all panels
4. ✅ Practice zooming and filtering
5. ✅ Set up auto-refresh
```

### Short Term (This Month)

```
1. ⬜ Add custom panels for business metrics
2. ⬜ Set up basic alerts (error rate, memory)
3. ⬜ Create deployment annotations
4. ⬜ Share dashboard with team
5. ⬜ Establish monitoring routine
```

### Long Term (This Quarter)

```
1. ⬜ Set up advanced alerting with PagerDuty/Slack
2. ⬜ Implement SLO/SLA dashboards
3. ⬜ Add distributed tracing (Jaeger)
4. ⬜ Integrate with log aggregation (ELK/Loki)
5. ⬜ Create executive dashboards
6. ⬜ Set up long-term storage (Thanos/Cortex)
```

---

## Additional Resources

### Documentation

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/) - Pre-built dashboards

### Learning

- [Prometheus Up & Running](https://www.oreilly.com/library/view/prometheus-up/9781492034131/) - Book
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Tutorials](https://grafana.com/tutorials/)

### Community

- [Prometheus Community Forums](https://prometheus.io/community/)
- [Grafana Community Forums](https://community.grafana.com/)
- [/r/PrometheusMonitoring](https://reddit.com/r/PrometheusMonitoring)

---

## Summary

You now have a complete monitoring stack with:

✅ **Prometheus** - Collecting metrics every 10 seconds
✅ **Grafana** - Visualizing 10 key performance indicators  
✅ **Automatic tracking** - All requests automatically monitored
✅ **Pre-built dashboard** - Ready to use immediately
✅ **Documentation** - Complete guide for usage

**Start monitoring:**
```bash
# 1. Ensure services are running
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Start your app
npm run start:dev

# 3. Generate test traffic
./scripts/generate-test-traffic.sh

# 4. Open Grafana
open http://localhost:3001
# Login: admin / admin

# 5. View your dashboard
# Dashboards → Bloomverd SMS - API Monitoring
```

Happy monitoring! 🎉📊📈
