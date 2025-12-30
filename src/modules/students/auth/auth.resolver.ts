import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  RequestPasswordResetInput,
  ResetPasswordInput,
} from 'src/shared/inputs';
import {
  PasswordResetResponseType,
  ResetResponse,
  StudentLoginResponse,
} from 'src/shared/types';
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
  @Mutation(() => PasswordResetResponseType)
  async requestPasswordReset(
    @Args('input') input: RequestPasswordResetInput,
  ): Promise<PasswordResetResponseType> {
    return this.authService.requestPasswordReset(input.email);
  }

  @Mutation(() => PasswordResetResponseType)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<PasswordResetResponseType> {
    return this.authService.resetPassword(
      input.email,
      input.token,
      input.new_password,
    );
  }
}
