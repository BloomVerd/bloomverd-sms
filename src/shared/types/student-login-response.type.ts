import { Field, ObjectType } from '@nestjs/graphql';
import { Student } from 'src/modules/students/student/entities/student.entity';

@ObjectType()
export class StudentLoginResponse extends Student {
  @Field()
  token: string;

  @Field()
  refresh_token: string;
}
