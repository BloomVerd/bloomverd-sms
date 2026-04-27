import { registerEnumType } from '@nestjs/graphql';

export enum StudentType {
  REGULAR = 'REGULAR',
  FEE_PAYING = 'FEE_PAYING',
  INTERNATIONAL = 'INTERNATIONAL',
}

registerEnumType(StudentType, {
  name: 'StudentType',
  description: 'Type of student',
});
