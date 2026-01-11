import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Organization')
export class OrganizationTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field()
  profile_url: string;
}
