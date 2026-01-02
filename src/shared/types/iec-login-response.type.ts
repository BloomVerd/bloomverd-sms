import { Field, ObjectType } from '@nestjs/graphql';
import { IecTypeClass } from 'src/database/types';

@ObjectType()
export class IecLoginResponse extends IecTypeClass {
  @Field()
  token: string;
}
