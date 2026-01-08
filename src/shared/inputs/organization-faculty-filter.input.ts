import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationFacultyFilterInput {
  @Field({
    nullable: true,
  })
  collegeId?: string;
}
