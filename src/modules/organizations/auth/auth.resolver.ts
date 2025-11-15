import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrganizationTypeClass } from 'src/database/types';
import { RegisterInput } from 'src/shared/inputs';
import { RegisterResponseType } from 'src/shared/types';

@Resolver()
export class AuthResolver {
  @Query(() => OrganizationTypeClass)
  async loginOrganization() {
    return {
      id: '1',
      email: 'organization@example.com',
    };
  }

  @Mutation(() => RegisterResponseType)
  async registerOrganization(
    @Args('input') input: RegisterInput,
  ): Promise<RegisterResponseType> {
    console.log(input);
    return {
      message: 'Created successfully',
    };
  }
}
