import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PasswordResetResponseType {
  @Field()
  message: string;
}
