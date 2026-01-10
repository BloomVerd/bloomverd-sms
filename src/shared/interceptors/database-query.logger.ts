import { Injectable } from '@nestjs/common';
import { QueryRunner, Logger as TypeOrmLogger } from 'typeorm';
import { AppLoggerService } from '../services/logger.service';
import { MetricsService } from '../services/metrics.service';

/**
 * Custom TypeORM logger that tracks query metrics
 */
@Injectable()
export class DatabaseQueryLogger implements TypeOrmLogger {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('DatabaseQueryLogger');
  }

  /**
   * Logs query and tracks metrics.
   * This is called AFTER query execution completes.
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    const queryType = this.extractQueryType(query);

    // Track the query
    this.metricsService.trackDbQuery(queryType);

    // For duration, we'll use a small default since we don't have precise timing
    // The slow query logger will capture actual slow queries
    this.metricsService.trackDbQueryDuration(queryType, 0.01);
  }

  /**
   * Logs query that is failed.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ): void {
    const queryType = this.extractQueryType(query);

    // Track failed query
    this.metricsService.trackDbQuery(queryType);
    this.metricsService.trackDbQueryDuration(queryType, 0.01);

    this.logger.error(
      `Query failed: ${query} -- Parameters: ${this.stringifyParameters(parameters)} -- Error: ${error}`,
    );
  }

  /**
   * Logs query that is slow.
   * This is called with the actual execution time.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ): void {
    const queryType = this.extractQueryType(query);

    // Track slow query with actual duration
    this.metricsService.trackDbQuery(queryType);
    this.metricsService.trackDbQueryDuration(queryType, time / 1000); // Convert ms to seconds

    this.logger.warn(
      `Slow query detected (${time}ms): ${query} -- Parameters: ${this.stringifyParameters(parameters)}`,
    );
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    this.logger.log(message);
  }

  /**
   * Logs events from the migrations run process.
   */
  logMigration(message: string, queryRunner?: QueryRunner): void {
    this.logger.log(message);
  }

  /**
   * Perform logging using given logger, or by default to the console.
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ): void {
    if (level === 'log' || level === 'info') {
      this.logger.log(message);
    } else if (level === 'warn') {
      this.logger.warn(message);
    }
  }

  private extractQueryType(query: string): string {
    const normalizedQuery = query.trim().toUpperCase();

    if (normalizedQuery.startsWith('SELECT')) {
      return 'SELECT';
    } else if (normalizedQuery.startsWith('INSERT')) {
      return 'INSERT';
    } else if (normalizedQuery.startsWith('UPDATE')) {
      return 'UPDATE';
    } else if (normalizedQuery.startsWith('DELETE')) {
      return 'DELETE';
    } else {
      return 'OTHER';
    }
  }

  private stringifyParameters(parameters?: any[]): string {
    try {
      return JSON.stringify(parameters);
    } catch (error) {
      return '';
    }
  }
}
