import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: 'Gender of entity',
});

@ObjectType('Student')
export class StudentTypeClass {
  @Field(() => ID)
  id: string;

  @Field(() => Gender)
  gender: Gender;
}
