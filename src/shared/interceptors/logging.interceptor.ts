import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      return this.handleGraphQL(context, next, startTime);
    } else if (contextType === 'http') {
      return this.handleHttp(context, next, startTime);
    }

    return next.handle();
  }

  private handleGraphQL(
    context: ExecutionContext,
    next: CallHandler,
    startTime: number,
  ): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const ctx = gqlContext.getContext();

    const operation = info?.fieldName || 'unknown';
    const operationType = info?.operation?.operation || 'query';
    const variables = gqlContext.getArgs();
    const userId = ctx?.req?.user?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.logGraphQL(
            operation,
            operationType,
            duration,
            userId,
            variables,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.logError(error, 'GraphQL', {
            operation,
            operationType,
            duration: `${duration}ms`,
            userId,
            variables,
          });
        },
      }),
    );
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler,
    startTime: number,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const userId = request.user?.id;

    // Skip logging for metrics endpoint
    if (url === '/metrics') {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.logRequest(
            method,
            url,
            response.statusCode,
            duration,
            userId,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.logError(error, 'HTTP', {
            method,
            url,
            duration: `${duration}ms`,
            userId,
          });
        },
      }),
    );
  }
}
