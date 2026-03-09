import { Field, ObjectType } from '@nestjs/graphql';
import { SemesterStatus } from '../enums';

@ObjectType()
export class StudentAcademicStructureResponse {
  @Field()
  label: string;

  @Field()
  id: string;

  @Field()
  status: SemesterStatus;
}
