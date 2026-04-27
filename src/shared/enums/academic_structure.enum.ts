import { registerEnumType } from '@nestjs/graphql';

export enum AcademicStructure {
  ANNUAL = 'ANNUAL',
  SEMESTER = 'SEMESTER',
}

registerEnumType(AcademicStructure, {
  name: 'AcademicStructure',
  description: 'Academic structure of an organization',
});
