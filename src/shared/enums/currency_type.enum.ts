import { registerEnumType } from '@nestjs/graphql';

export enum CurrencyType {
  USD = 'USD',
  GHS = 'GHS',
  EUR = 'EUR',
}

registerEnumType(CurrencyType, {
  name: 'CurrencyType',
  description: 'Currency type of entity',
});
