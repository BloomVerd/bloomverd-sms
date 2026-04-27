import { Field, ObjectType } from '@nestjs/graphql';
import { Iec } from 'src/modules/iecs/iec/entities/iec.entity';

@ObjectType()
export class IecLoginResponse extends Iec {
  @Field()
  token: string;
}
