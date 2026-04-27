import { registerEnumType } from '@nestjs/graphql';

export enum TestType {
  NORMAL_TEST = 'normal_test',
  CLASS_TEST = 'class_test',
  MID_SEMESTER = 'mid_semester',
  END_OF_SEMESTER_EXAM = 'end_of_semester_exam',
}

registerEnumType(TestType, {
  name: 'TestType',
  description: 'Type of test',
});
