import { Field, InputType } from '@nestjs/graphql';
import { CurrencyType, FeeType, LevelType, StudentType } from '../enums';

@InputType()
export class CreateFeeInput {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  feeType: FeeType;

  @Field()
  amount: number;

  @Field()
  currency: CurrencyType;

  @Field()
  studentType: StudentType;

  @Field()
  yearGroup: number;

  @Field()
  level: LevelType;
}
