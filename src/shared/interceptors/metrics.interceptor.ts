import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

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
    const operationName = info?.fieldName || 'unknown';

    this.metricsService.trackGraphQLQuery(operationName);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.trackGraphQLDuration(operationName, duration);
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.trackGraphQLDuration(operationName, duration);
          this.metricsService.trackGraphQLError(
            operationName,
            error?.constructor?.name || 'UnknownError',
          );
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
    const path = request.route?.path || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.trackHttpRequest(
            method,
            path,
            response.statusCode,
          );
          this.metricsService.trackHttpDuration(method, path, duration);
        },
        error: () => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.trackHttpRequest(method, path, 500);
          this.metricsService.trackHttpDuration(method, path, duration);
        },
      }),
    );
  }
}
