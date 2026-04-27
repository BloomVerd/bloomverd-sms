import { registerEnumType } from '@nestjs/graphql';

export enum QuestionType {
  OBJECTIVE = 'objective',
  FILL_IN = 'fill_in',
  WRITTEN = 'written',
}

registerEnumType(QuestionType, {
  name: 'QuestionType',
  description: 'Type of test question',
});
