import { registerEnumType } from '@nestjs/graphql';

export enum FeeType {
  ACADEMIC = 'ACADEMIC',
  OTHER = 'OTHER',
}

registerEnumType(FeeType, {
  name: 'FeeType',
  description: 'Fee type of entity',
});
