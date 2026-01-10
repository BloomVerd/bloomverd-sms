import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for metrics endpoint
    const request = this.getRequestResponse(context).req;
    if (request?.url === '/metrics') {
      return true;
    }
    return false;
  }

  getRequestResponse(context: ExecutionContext) {
    const contextType = context.getType<string>();

    // Handle HTTP requests (including /metrics)
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();
      return { req: request, res: response };
    }

    // Handle GraphQL requests
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }
}
