import { Field, ObjectType } from '@nestjs/graphql';

export type ValidationFieldType =
  | 'name'
  | 'email'
  | 'code'
  | 'phone_number'
  | 'first_name'
  | 'last_name'
  | 'gender'
  | 'date_of_birth'
  | 'address'
  | 'credits'
  | 'number_of_semesters'
  | 'semester_number';

@ObjectType()
export class ValidationResponseType {
  @Field()
  id: string;

  @Field()
  field: ValidationFieldType;

  @Field()
  input: string;

  @Field()
  message: string;
}
