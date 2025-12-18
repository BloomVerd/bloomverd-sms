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
  async loginOrganization(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.loginOrganization({ email, password });
  }

  // Mutations
  @Mutation(() => RegisterResponseType)
  async registerOrganization(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.registerOrganization({
      name,
      email,
      password,
    });
  }
}
