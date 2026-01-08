import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationClassFilterInput {
  @Field({
    nullable: true,
  })
  departmentId?: string;
}
