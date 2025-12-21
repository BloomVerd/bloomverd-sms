import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from 'src/shared/enums';

@ObjectType('Lecturer')
export class LecturerTypeClass {
  @Field(() => ID)
  id: string;

  @Field(() => Gender)
  gender: Gender;
}
