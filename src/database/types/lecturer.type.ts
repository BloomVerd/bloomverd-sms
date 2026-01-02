import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from './student.type';

@ObjectType('Lecturer')
export class LecturerTypeClass {
  @Field(() => ID)
  id: string;

  @Field(() => Gender)
  gender: Gender;
}
