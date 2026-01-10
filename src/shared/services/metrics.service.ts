import { Injectable } from '@nestjs/common';
import {
  InjectMetric,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    // HTTP metrics
    @InjectMetric('http_requests_total')
    private httpRequestCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private httpRequestDuration: Histogram<string>,

    // GraphQL metrics
    @InjectMetric('graphql_queries_total')
    private graphqlQueryCounter: Counter<string>,
    @InjectMetric('graphql_query_duration_seconds')
    private graphqlQueryDuration: Histogram<string>,
    @InjectMetric('graphql_errors_total')
    private graphqlErrorCounter: Counter<string>,

    // Database metrics
    @InjectMetric('db_queries_total')
    private dbQueryCounter: Counter<string>,
    @InjectMetric('db_query_duration_seconds')
    private dbQueryDuration: Histogram<string>,
    @InjectMetric('db_connections_active')
    private dbConnectionsActive: Gauge<string>,

    // Authentication metrics
    @InjectMetric('authentication_attempts_total')
    private authenticationAttemptsCounter: Counter<string>,
    @InjectMetric('authentication_successes_total')
    private authenticationSuccessesCounter: Counter<string>,
    @InjectMetric('authentication_failures_total')
    private authenticationFailuresCounter: Counter<string>,
    @InjectMetric('active_sessions')
    private activeSessionsGauge: Gauge<string>,

    // SMS metrics
    @InjectMetric('sms_sent_total')
    private smsSentCounter: Counter<string>,
    @InjectMetric('sms_failed_total')
    private smsFailedCounter: Counter<string>,
    @InjectMetric('sms_delivery_duration_seconds')
    private smsDeliveryDuration: Histogram<string>,

    // User/Entity metrics
    @InjectMetric('users_created_total')
    private usersCreatedCounter: Counter<string>,
    @InjectMetric('students_created_total')
    private studentsCreatedCounter: Counter<string>,
    @InjectMetric('organizations_created_total')
    private organizationsCreatedCounter: Counter<string>,

    // File upload metrics
    @InjectMetric('file_uploads_total')
    private fileUploadsCounter: Counter<string>,
    @InjectMetric('file_upload_size_bytes')
    private fileUploadSize: Histogram<string>,

    // Cache metrics
    @InjectMetric('cache_hits_total')
    private cacheHitsCounter: Counter<string>,
    @InjectMetric('cache_misses_total')
    private cacheMissesCounter: Counter<string>,

    // Error metrics
    @InjectMetric('application_errors_total')
    private applicationErrorsCounter: Counter<string>,
  ) {}

  // HTTP metrics
  trackHttpRequest(method: string, path: string, statusCode: number) {
    this.httpRequestCounter?.inc({ method, path, status_code: statusCode });
  }

  trackHttpDuration(method: string, path: string, duration: number) {
    this.httpRequestDuration?.observe({ method, path }, duration);
  }

  // GraphQL metrics
  trackGraphQLQuery(operationName: string) {
    this.graphqlQueryCounter?.inc({ operation: operationName });
  }

  trackGraphQLDuration(operationName: string, duration: number) {
    this.graphqlQueryDuration?.observe({ operation: operationName }, duration);
  }

  trackGraphQLError(operationName: string, errorType: string) {
    this.graphqlErrorCounter?.inc({
      operation: operationName,
      error_type: errorType,
    });
  }

  // Database metrics
  trackDbQuery(queryType: string) {
    this.dbQueryCounter?.inc({ query_type: queryType });
  }

  trackDbQueryDuration(queryType: string, duration: number) {
    this.dbQueryDuration?.observe({ query_type: queryType }, duration);
  }

  // Authentication metrics
  trackAuthenticationAttempt(method: string, provider: string = 'local') {
    this.authenticationAttemptsCounter?.inc({ method, provider });
  }

  trackAuthenticationSuccess(method: string, provider: string = 'local') {
    this.authenticationSuccessesCounter?.inc({ method, provider });
  }

  trackAuthenticationFailure(
    method: string,
    reason: string,
    provider: string = 'local',
  ) {
    this.authenticationFailuresCounter?.inc({ method, reason, provider });
  }

  // Convenience method for tracking full authentication flow
  trackAuthentication(
    success: boolean,
    method: string,
    provider: string = 'local',
    failureReason?: string,
  ) {
    this.trackAuthenticationAttempt(method, provider);
    if (success) {
      this.trackAuthenticationSuccess(method, provider);
    } else {
      this.trackAuthenticationFailure(
        method,
        failureReason || 'unknown',
        provider,
      );
    }
  }

  // Session metrics
  setActiveSessions(count: number) {
    this.activeSessionsGauge?.set(count);
  }

  incrementActiveSessions() {
    this.activeSessionsGauge?.inc();
  }

  decrementActiveSessions() {
    this.activeSessionsGauge?.dec();
  }

  // Database connection metrics
  setActiveDbConnections(count: number) {
    this.dbConnectionsActive?.set(count);
  }

  // SMS metrics
  trackSmsSent(provider: string, messageType: string = 'transactional') {
    this.smsSentCounter?.inc({ provider, message_type: messageType });
  }

  trackSmsFailed(provider: string, reason: string) {
    this.smsFailedCounter?.inc({ provider, reason });
  }

  trackSmsDeliveryDuration(provider: string, duration: number) {
    this.smsDeliveryDuration?.observe({ provider }, duration);
  }

  // Entity creation metrics
  trackUserCreated(role: string) {
    this.usersCreatedCounter?.inc({ role });
  }

  trackStudentCreated(organizationId?: string) {
    this.studentsCreatedCounter?.inc({
      organization_id: organizationId || 'unknown',
    });
  }

  trackOrganizationCreated(type: string = 'standard') {
    this.organizationsCreatedCounter?.inc({ type });
  }

  // File upload metrics
  trackFileUpload(fileType: string, success: boolean) {
    this.fileUploadsCounter?.inc({
      file_type: fileType,
      status: success ? 'success' : 'failed',
    });
  }

  trackFileUploadSize(fileType: string, sizeBytes: number) {
    this.fileUploadSize?.observe({ file_type: fileType }, sizeBytes);
  }

  // Cache metrics
  trackCacheHit(cacheType: string) {
    this.cacheHitsCounter?.inc({ cache_type: cacheType });
  }

  trackCacheMiss(cacheType: string) {
    this.cacheMissesCounter?.inc({ cache_type: cacheType });
  }

  // Error metrics
  trackApplicationError(errorType: string, context: string) {
    this.applicationErrorsCounter?.inc({ error_type: errorType, context });
  }
}

// Metric providers for dependency injection
export const metricsProviders = [
  // HTTP metrics
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
  }),
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  }),

  // GraphQL metrics
  makeCounterProvider({
    name: 'graphql_queries_total',
    help: 'Total number of GraphQL queries',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'graphql_query_duration_seconds',
    help: 'GraphQL query duration in seconds',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  }),
  makeCounterProvider({
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation', 'error_type'],
  }),

  // Database metrics
  makeCounterProvider({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['query_type'],
  }),
  makeHistogramProvider({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['query_type'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  }),
  makeGaugeProvider({
    name: 'db_connections_active',
    help: 'Number of active database connections',
    labelNames: [],
  }),

  // Authentication metrics
  makeCounterProvider({
    name: 'authentication_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['method', 'provider'],
  }),
  makeCounterProvider({
    name: 'authentication_successes_total',
    help: 'Total number of successful authentications',
    labelNames: ['method', 'provider'],
  }),
  makeCounterProvider({
    name: 'authentication_failures_total',
    help: 'Total number of failed authentication attempts',
    labelNames: ['method', 'reason', 'provider'],
  }),
  makeGaugeProvider({
    name: 'active_sessions',
    help: 'Number of currently active user sessions',
    labelNames: [],
  }),

  // SMS metrics
  makeCounterProvider({
    name: 'sms_sent_total',
    help: 'Total number of SMS messages sent',
    labelNames: ['provider', 'message_type'],
  }),
  makeCounterProvider({
    name: 'sms_failed_total',
    help: 'Total number of failed SMS messages',
    labelNames: ['provider', 'reason'],
  }),
  makeHistogramProvider({
    name: 'sms_delivery_duration_seconds',
    help: 'SMS delivery duration in seconds',
    labelNames: ['provider'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Entity creation metrics
  makeCounterProvider({
    name: 'users_created_total',
    help: 'Total number of users created',
    labelNames: ['role'],
  }),
  makeCounterProvider({
    name: 'students_created_total',
    help: 'Total number of students created',
    labelNames: ['organization_id'],
  }),
  makeCounterProvider({
    name: 'organizations_created_total',
    help: 'Total number of organizations created',
    labelNames: ['type'],
  }),

  // File upload metrics
  makeCounterProvider({
    name: 'file_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['file_type', 'status'],
  }),
  makeHistogramProvider({
    name: 'file_upload_size_bytes',
    help: 'File upload size in bytes',
    labelNames: ['file_type'],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB, 10KB, 100KB, 1MB, 10MB, 100MB
  }),

  // Cache metrics
  makeCounterProvider({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),
  makeCounterProvider({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),

  // Error metrics
  makeCounterProvider({
    name: 'application_errors_total',
    help: 'Total number of application errors',
    labelNames: ['error_type', 'context'],
  }),
];
