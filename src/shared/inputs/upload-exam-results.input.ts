import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UploadExamResultsInput {
  @Field()
  student_email: string;

  @Field()
  score: number;

  @Field()
  exam_id: string;
}
