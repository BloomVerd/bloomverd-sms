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

  @Field(() => String)
  first_name: string;

  @Field(() => String)
  last_name: string;

  @Field(() => Gender)
  gender: Gender;

  @Field(() => String)
  email: string;

  @Field(() => String)
  phone_number: string;

  @Field(() => String)
  address: string;

  @Field(() => Date)
  date_of_birth: Date;
}
