import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  OrganizationLoginResponse,
  RegisterResponseType,
} from 'src/shared/types';
import { AuthService } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // Queries
  @Query(() => OrganizationLoginResponse)
  async loginIEC(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.loginIEC({ email, password });
  }

  // Mutations
  @Mutation(() => RegisterResponseType)
  async registerIEC(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.registerIEC({
      name,
      email,
      password,
    });
  }
}
