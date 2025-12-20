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
  | 'credits';

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
