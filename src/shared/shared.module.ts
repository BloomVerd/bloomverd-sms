import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { MetricsService, metricsProviders } from './services/metrics.service';

@Global()
@Module({
  providers: [
    MetricsService,
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class SharedModule {}
