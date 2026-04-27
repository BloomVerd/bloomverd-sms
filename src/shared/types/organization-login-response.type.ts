import { Field, ObjectType } from '@nestjs/graphql';
import { Organization } from 'src/modules/organizations/org/entities/organization.entity';

@ObjectType()
export class OrganizationLoginResponse extends Organization {
  @Field()
  token: string;

  @Field()
  refresh_token: string;
}
