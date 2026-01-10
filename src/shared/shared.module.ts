import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { DatabaseQueryLogger } from './interceptors/database-query.logger';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { AppLoggerService } from './services/logger.service';
import { MetricsService, metricsProviders } from './services/metrics.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    AppLoggerService,
    MetricsService,
    DatabaseQueryLogger,
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [AppLoggerService, MetricsService, DatabaseQueryLogger],
})
export class SharedModule {}
