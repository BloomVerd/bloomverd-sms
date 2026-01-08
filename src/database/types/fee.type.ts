import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum CurrencyType {
  USD = 'USD',
  GHS = 'GHS',
  EUR = 'EUR',
}

export enum FeeType {
  ACADEMIC = 'ACADEMIC',
  OTHER = 'OTHER',
}

export enum LevelType {
  L100 = 'L100',
  L200 = 'L200',
  L300 = 'L300',
  L400 = 'L400',
  L500 = 'L500',
  L600 = 'L600',
}

registerEnumType(CurrencyType, {
  name: 'CurrencyType',
  description: 'Currency type of entity',
});

registerEnumType(FeeType, {
  name: 'FeeType',
  description: 'Fee type of entity',
});

registerEnumType(LevelType, {
  name: 'LevelType',
  description: 'Level type of entity',
});

@ObjectType('Fee')
export class FeeTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  fee_amount: number;

  @Field(() => CurrencyType)
  currency: CurrencyType;

  @Field(() => FeeType)
  fee_type: FeeType;

  @Field(() => LevelType)
  level: LevelType;
}
