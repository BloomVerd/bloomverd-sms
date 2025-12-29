import { Field, ObjectType } from '@nestjs/graphql';
import { StudentTypeClass } from 'src/database/types';

@ObjectType()
export class StudentLoginResponse extends StudentTypeClass {
  @Field()
  token: string;
}
