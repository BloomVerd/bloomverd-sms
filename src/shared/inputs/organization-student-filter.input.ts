import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationStudentFilterInput {
  @Field({
    nullable: true,
  })
  collegeId?: string;

  @Field({
    nullable: true,
  })
  facultyId?: string;

  @Field({
    nullable: true,
  })
  departmentId?: string;

  @Field({
    nullable: true,
  })
  classId?: string;
}
