import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationCourseFilterInput {
  @Field({
    nullable: true,
  })
  classId?: string;
}
