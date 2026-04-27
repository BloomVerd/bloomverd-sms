import { registerEnumType } from '@nestjs/graphql';

export enum SemesterStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

registerEnumType(SemesterStatus, {
  name: 'SemesterStatus',
  description: 'Status of a semester',
});
