import { Injectable } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP request metrics
  private httpRequestCounter: Counter;
  private httpRequestDuration: Histogram;

  // GraphQL metrics
  private graphqlQueryCounter: Counter;
  private graphqlQueryDuration: Histogram;
  private graphqlErrorCounter: Counter;

  // Database metrics
  private dbQueryCounter: Counter;
  private dbQueryDuration: Histogram;

  // Business metrics
  private authenticationCounter: Counter;
  private authenticationFailureCounter: Counter;

  initializeMetrics(
    httpCounter: Counter,
    httpDuration: Histogram,
    gqlCounter: Counter,
    gqlDuration: Histogram,
    gqlErrorCounter: Counter,
    dbCounter: Counter,
    dbDuration: Histogram,
    authCounter: Counter,
    authFailureCounter: Counter,
  ) {
    this.httpRequestCounter = httpCounter;
    this.httpRequestDuration = httpDuration;
    this.graphqlQueryCounter = gqlCounter;
    this.graphqlQueryDuration = gqlDuration;
    this.graphqlErrorCounter = gqlErrorCounter;
    this.dbQueryCounter = dbCounter;
    this.dbQueryDuration = dbDuration;
    this.authenticationCounter = authCounter;
    this.authenticationFailureCounter = authFailureCounter;
  }

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
    this.graphqlErrorCounter?.inc({ operation: operationName, error_type: errorType });
  }

  // Database metrics
  trackDbQuery(queryType: string) {
    this.dbQueryCounter?.inc({ query_type: queryType });
  }

  trackDbQueryDuration(queryType: string, duration: number) {
    this.dbQueryDuration?.observe({ query_type: queryType }, duration);
  }

  // Authentication metrics
  trackAuthentication(success: boolean, method: string) {
    if (success) {
      this.authenticationCounter?.inc({ method });
    } else {
      this.authenticationFailureCounter?.inc({ method });
    }
  }
}

// Metric providers for dependency injection
export const metricsProviders = [
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
  }),
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  makeCounterProvider({
    name: 'graphql_queries_total',
    help: 'Total number of GraphQL queries',
    labelNames: ['operation'],
  }),
  makeHistogramProvider({
    name: 'graphql_query_duration_seconds',
    help: 'GraphQL query duration in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  makeCounterProvider({
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation', 'error_type'],
  }),
  makeCounterProvider({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['query_type'],
  }),
  makeHistogramProvider({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
  }),
  makeCounterProvider({
    name: 'authentication_attempts_total',
    help: 'Total number of successful authentication attempts',
    labelNames: ['method'],
  }),
  makeCounterProvider({
    name: 'authentication_failures_total',
    help: 'Total number of failed authentication attempts',
    labelNames: ['method'],
  }),
];
