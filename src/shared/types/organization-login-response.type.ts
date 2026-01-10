import { Field, ObjectType } from '@nestjs/graphql';
import { OrganizationTypeClass } from 'src/database/types';

@ObjectType()
export class OrganizationLoginResponse extends OrganizationTypeClass {
  @Field()
  token: string;

  @Field()
  refresh_token: string;
}
