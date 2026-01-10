import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Response } from 'express';
import { AppLoggerService } from '../services/logger.service';
import { MetricsService } from '../services/metrics.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly metricsService: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType<string>();

    if (contextType === 'http') {
      this.handleHttpException(exception, host);
    } else if (contextType === 'graphql') {
      this.handleGraphQLException(exception, host);
    }
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Track error metrics
    const errorType = this.getErrorType(exception);
    this.metricsService.trackApplicationError(errorType, 'http');

    // Log the error
    this.logger.logError(
      exception instanceof Error ? exception : new Error(String(exception)),
      'HTTP',
      {
        statusCode: status,
        method: request.method,
        url: request.url,
        userId: request.user?.id,
        body: request.body,
      },
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleGraphQLException(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();
    const context = gqlHost.getContext();

    // Track error metrics
    const errorType = this.getErrorType(exception);
    this.metricsService.trackApplicationError(errorType, 'graphql');

    // Log the error
    this.logger.logError(
      exception instanceof Error ? exception : new Error(String(exception)),
      'GraphQL',
      {
        operation: info?.fieldName,
        operationType: info?.operation?.operation,
        userId: context?.req?.user?.id,
        variables: gqlHost.getArgs(),
      },
    );

    // Re-throw for GraphQL to handle
    throw exception;
  }

  private getErrorType(exception: unknown): string {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 400) return 'bad_request';
      if (status === 401) return 'unauthorized';
      if (status === 403) return 'forbidden';
      if (status === 404) return 'not_found';
      if (status === 409) return 'conflict';
      if (status === 422) return 'validation_error';
      if (status >= 500) return 'internal_server_error';
      return `http_${status}`;
    }
    if (exception instanceof Error) {
      return exception.name.toLowerCase().replace(/error$/, '_error');
    }
    return 'unknown_error';
  }
}
