import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ResetResponse, StudentLoginResponse } from 'src/shared/types';
import { AuthService } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // Queries
  @Query(() => StudentLoginResponse)
  async loginStudent(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.loginStudent({ email, password });
  }

  // Mutations
  @Mutation(() => ResetResponse)
  async requestPasswordReset(@Args('email') email: string) {
    return this.authService.requestPasswordReset({ email });
  }

  @Mutation(() => ResetResponse)
  async resetPassword(
    @Args('resetToken') resetToken: string,
    @Args('password') password: string,
    @Args('email') email: string,
  ) {
    return this.authService.resetPassword({ resetToken, password, email });
  }
}
