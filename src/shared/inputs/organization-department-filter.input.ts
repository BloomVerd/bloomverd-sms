import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationDepartmentFilterInput {
  @Field({
    nullable: true,
  })
  facultyId?: string;
}
