# Logging Setup - Bloomverd SMS

**Date:** 2026-01-10  
**Purpose:** Comprehensive logging implementation using Winston for structured logging and debugging

## Overview

The application uses **Winston** for structured logging with multiple transports (console, files) and log levels. All HTTP requests, GraphQL operations, database queries, authentication events, and errors are automatically logged.

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Controllers, Resolvers, Services)     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Logging Interceptor                │
│  - Captures HTTP/GraphQL requests       │
│  - Measures duration                    │
│  - Logs success/failure                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Global Exception Filter            │
│  - Catches all unhandled errors         │
│  - Logs with full context               │
│  - Formats error response               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       AppLoggerService                  │
│  - Winston logger wrapper               │
│  - Multiple log levels                  │
│  - Structured metadata                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Winston Transports              │
│  - Console (colored, formatted)         │
│  - File: logs/combined.log              │
│  - File: logs/error.log                 │
└─────────────────────────────────────────┘
```

## Implementation

### 1. AppLoggerService

**File:** `src/shared/services/logger.service.ts`

A custom logger service that wraps Winston and provides structured logging.

#### Features

- **Multiple Log Levels:** `error`, `warn`, `info`, `debug`, `verbose`
- **Structured Metadata:** JSON format with timestamps
- **Context Support:** Tag logs with context (e.g., "HTTP", "GraphQL", "Database")
- **Environment-Aware:** Different log levels for dev vs production
- **File Rotation:** Separate files for errors and all logs

#### Log Levels

```typescript
Production:  info, warn, error
Development: debug, verbose, info, warn, error
```

#### Transports

1. **Console Transport**
   - Colored output in development
   - Human-readable format
   - Shows: `timestamp level [context] message`

2. **File Transport - Combined**
   - Path: `logs/combined.log`
   - Level: all
   - Format: JSON

3. **File Transport - Errors**
   - Path: `logs/error.log`
   - Level: error only
   - Format: JSON with stack traces

#### Configuration

```typescript
constructor(private configService: ConfigService) {
  const isProduction = this.configService.get('STAGE') === 'production';
  
  this.logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: {
      service: 'bloomverd-sms',
      environment: this.configService.get('STAGE'),
    },
    // ... transports
  });
}
```

---

### 2. LoggingInterceptor

**File:** `src/shared/interceptors/logging.interceptor.ts`

Automatically logs all HTTP and GraphQL requests.

#### What It Logs

**HTTP Requests:**
```json
{
  "timestamp": "2026-01-10 14:30:45",
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

**GraphQL Operations:**
```json
{
  "timestamp": "2026-01-10 14:30:50",
  "level": "info",
  "message": "GraphQL Operation",
  "context": "GraphQL",
  "operation": "getStudents",
  "operationType": "query",
  "duration": "120ms",
  "userId": "user-123",
  "variables": { "limit": 10 }
}
```

---

### 3. GlobalExceptionFilter

**File:** `src/shared/filters/global-exception.filter.ts`

Catches all unhandled exceptions and logs them with full context.

#### Error Logging

**HTTP Errors:**
```json
{
  "timestamp": "2026-01-10 14:31:00",
  "level": "error",
  "message": "User not found",
  "context": "HTTP",
  "stack": "Error: User not found\n    at UserService.findOne...",
  "name": "NotFoundException",
  "statusCode": 404,
  "method": "GET",
  "url": "/api/users/999",
  "userId": "user-123",
  "body": {}
}
```

**GraphQL Errors:**
```json
{
  "timestamp": "2026-01-10 14:31:05",
  "level": "error",
  "message": "Invalid input",
  "context": "GraphQL",
  "stack": "Error: Invalid input...",
  "operation": "createStudent",
  "operationType": "mutation",
  "userId": "user-123",
  "variables": { "name": "", "email": "test@test.com" }
}
```

---

### 4. Database Query Logging

**File:** `src/shared/interceptors/database-query.logger.ts`

Logs database queries (integrated with TypeORM).

#### What It Logs

**Debug Level (Development):**
```json
{
  "timestamp": "2026-01-10 14:32:00",
  "level": "debug",
  "message": "Database Query",
  "context": "Database",
  "query": "SELECT * FROM students WHERE id = $1",
  "duration": "12ms",
  "parameters": [1]
}
```

**Slow Queries (> 1 second):**
```json
{
  "timestamp": "2026-01-10 14:32:10",
  "level": "warn",
  "message": "Slow query detected (1523ms): SELECT ...",
  "context": "DatabaseQueryLogger"
}
```

**Failed Queries:**
```json
{
  "timestamp": "2026-01-10 14:32:15",
  "level": "error",
  "message": "Query failed: INSERT INTO ...",
  "context": "DatabaseQueryLogger"
}
```

---

## Usage Examples

### In Your Services

```typescript
import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@shared/services/logger.service';

@Injectable()
export class StudentService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('StudentService');
  }

  async findAll() {
    this.logger.log('Fetching all students');
    
    try {
      const students = await this.studentRepository.find();
      this.logger.log(`Found ${students.length} students`);
      return students;
    } catch (error) {
      this.logger.error('Failed to fetch students', error.stack);
      throw error;
    }
  }

  async create(data: CreateStudentDto) {
    this.logger.logWithMetadata('info', 'Creating new student', {
      email: data.email,
      yearGroup: data.yearGroup,
    });
    
    const student = await this.studentRepository.save(data);
    
    this.logger.logBusinessEvent('student_created', {
      studentId: student.id,
      email: student.email,
    });
    
    return student;
  }
}
```

### Authentication Logging

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('AuthService');
  }

  async login(email: string, password: string) {
    try {
      const user = await this.validateUser(email, password);
      
      // Log successful login
      this.logger.logAuth('login', user.id, user.email);
      
      return this.generateToken(user);
    } catch (error) {
      // Log failed login
      this.logger.logAuth('login_failed', undefined, email, error.message);
      throw error;
    }
  }

  async logout(userId: string) {
    this.logger.logAuth('logout', userId);
  }
}
```

### Custom Metadata Logging

```typescript
this.logger.logWithMetadata('info', 'Processing payment', {
  orderId: order.id,
  amount: order.total,
  currency: 'USD',
  paymentMethod: 'credit_card',
  userId: user.id,
});
```

### Error Logging with Context

```typescript
try {
  await this.processOrder(order);
} catch (error) {
  this.logger.logError(error, 'OrderService', {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items.length,
  });
  throw error;
}
```

---

## Log Methods Reference

### Basic Methods

```typescript
// Simple log levels
logger.log('Info message');
logger.error('Error message', stackTrace);
logger.warn('Warning message');
logger.debug('Debug message');
logger.verbose('Verbose message');

// With context
logger.log('Message', 'MyContext');
logger.error('Error', stackTrace, 'MyContext');
```

### Specialized Methods

```typescript
// HTTP request logging
logger.logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string
);

// GraphQL operation logging
logger.logGraphQL(
  operation: string,
  operationType: string,
  duration: number,
  userId?: string,
  variables?: any
);

// Database query logging
logger.logDatabaseQuery(
  query: string,
  duration: number,
  parameters?: any[]
);

// Authentication logging
logger.logAuth(
  event: 'login' | 'logout' | 'login_failed' | 'token_refresh',
  userId?: string,
  email?: string,
  reason?: string
);

// Error logging with stack
logger.logError(
  error: Error,
  context?: string,
  metadata?: Record<string, any>
);

// Business event logging
logger.logBusinessEvent(
  event: string,
  data: Record<string, any>,
  context?: string
);

// Custom metadata
logger.logWithMetadata(
  level: string,
  message: string,
  metadata: Record<string, any>,
  context?: string
);
```

---

## Log File Locations

```
logs/
├── combined.log       # All logs (JSON format)
├── error.log          # Errors only (JSON format)
└── .gitkeep          # Keeps directory in git
```

**Note:** Log files are automatically created and are ignored by git.

---

## Log Rotation (Production)

For production, you should implement log rotation to prevent disk space issues.

### Option 1: winston-daily-rotate-file

```bash
npm install winston-daily-rotate-file
```

```typescript
import * as DailyRotateFile from 'winston-daily-rotate-file';

// Add to transports
new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
}),
```

### Option 2: External Log Management

Use external services:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** (Grafana Loki)
- **CloudWatch** (AWS)
- **Datadog**
- **Splunk**

---

## Environment Variables

Add to your `.env.development.local`:

```bash
# Logging
LOG_LEVEL=debug           # debug, info, warn, error
LOG_FILE_ENABLED=true     # Enable file logging
LOG_CONSOLE_ENABLED=true  # Enable console logging
```

Update `logger.service.ts` to use these:

```typescript
level: this.configService.get('LOG_LEVEL') || (isProduction ? 'info' : 'debug'),
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug('User query params:', params);      // Development details
logger.info('User logged in', userId);           // Important events
logger.warn('Rate limit approaching', count);    // Potential issues
logger.error('Database connection failed');      // Errors

// ❌ Bad
logger.info('Variable x = 5');                   // Use debug
logger.error('User clicked button');             // Use info
```

### 2. Include Context

```typescript
// ✅ Good
logger.setContext('OrderService');
logger.log('Processing order', 'OrderService');

// ❌ Bad
logger.log('Processing');  // No context
```

### 3. Log Structured Data

```typescript
// ✅ Good
logger.logWithMetadata('info', 'Order created', {
  orderId: order.id,
  customerId: customer.id,
  total: order.total,
  items: order.items.length,
});

// ❌ Bad
logger.log(`Order ${order.id} created by ${customer.id} for $${order.total} with ${order.items.length} items`);
```

### 4. Don't Log Sensitive Data

```typescript
// ❌ NEVER log these
logger.log('Password:', password);
logger.log('Credit card:', creditCard);
logger.log('SSN:', ssn);
logger.log('API key:', apiKey);

// ✅ Log references only
logger.log('User authenticated:', userId);
logger.log('Payment processed:', paymentId);
```

### 5. Log Business Events

```typescript
// ✅ Track important business events
logger.logBusinessEvent('order_placed', {
  orderId: order.id,
  revenue: order.total,
  itemCount: order.items.length,
});

logger.logBusinessEvent('user_registered', {
  userId: user.id,
  plan: user.subscription,
  source: user.registrationSource,
});
```

---

## Viewing Logs

### Development (Console)

Logs automatically appear in your terminal with colors:

```
2026-01-10 14:30:45 info [HTTP] HTTP Request
{
  "method": "GET",
  "url": "/api/students",
  "statusCode": 200,
  "duration": "45ms"
}
```

### Production (Files)

**Tail combined log:**
```bash
tail -f logs/combined.log
```

**Tail error log:**
```bash
tail -f logs/error.log
```

**Search for specific user:**
```bash
grep "user-123" logs/combined.log
```

**View today's errors:**
```bash
cat logs/error.log | jq 'select(.timestamp | startswith("2026-01-10"))'
```

### Using jq for JSON Logs

```bash
# Pretty print
cat logs/combined.log | jq '.'

# Filter by level
cat logs/combined.log | jq 'select(.level == "error")'

# Filter by context
cat logs/combined.log | jq 'select(.context == "GraphQL")'

# Extract specific fields
cat logs/combined.log | jq '{timestamp, level, message, userId}'

# Count errors by type
cat logs/error.log | jq '.name' | sort | uniq -c
```

---

## Integration with Log Aggregation

### Elasticsearch + Kibana

1. **Install Filebeat:**
```bash
# Send logs to Elasticsearch
filebeat.inputs:
  - type: log
    paths:
      - /path/to/logs/*.log
    json.keys_under_root: true

output.elasticsearch:
  hosts: ["localhost:9200"]
```

2. **Query in Kibana:**
```
level: "error" AND userId: "user-123"
context: "GraphQL" AND operationType: "mutation"
duration > 1000
```

### Grafana Loki

1. **Install Promtail:**
```yaml
# promtail-config.yml
clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: bloomverd-sms
    static_configs:
      - targets: [localhost]
        labels:
          job: bloomverd-sms
          __path__: /path/to/logs/*.log
```

2. **Query in Grafana:**
```
{job="bloomverd-sms"} |= "error"
{job="bloomverd-sms"} | json | userId="user-123"
{job="bloomverd-sms"} | json | duration > 1000
```

---

## Troubleshooting

### Logs not appearing

1. **Check log directory exists:**
```bash
ls -la logs/
```

2. **Check permissions:**
```bash
chmod 755 logs/
```

3. **Check console output:**
```bash
# Should see logs in terminal
npm run start:dev
```

### Console logs but no file logs

1. **Check file transport configuration**
2. **Verify LOG_FILE_ENABLED=true**
3. **Check disk space:**
```bash
df -h
```

### Too many logs

1. **Increase log level in production:**
```typescript
level: 'info'  // Instead of 'debug'
```

2. **Disable verbose logging:**
```typescript
logging: process.env.NODE_ENV !== 'production'
```

3. **Implement log rotation**

---

## Performance Considerations

### Log Levels in Production

```typescript
// Production: info and above (info, warn, error)
level: isProduction ? 'info' : 'debug'
```

### Async Logging

Winston handles async writes automatically, but for high-throughput:

```typescript
// Buffer logs
transports: [
  new winston.transports.File({
    filename: 'logs/combined.log',
    options: { flags: 'a', highWaterMark: 16 * 1024 },
  }),
]
```

### Conditional Logging

```typescript
// Only log in development
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Detailed debug info', data);
}
```

---

## Summary

✅ **Winston logging** integrated with NestJS
✅ **Automatic logging** for HTTP, GraphQL, Database operations
✅ **Global exception filter** catches all errors
✅ **Structured logs** in JSON format
✅ **Multiple transports** (console, files)
✅ **Context-aware** logging
✅ **Environment-specific** log levels
✅ **Ready for log aggregation** (ELK, Loki, etc.)

Your application now has comprehensive logging! 🎉📝
