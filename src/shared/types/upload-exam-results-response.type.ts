import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UploadExamResultsResponseType {
  @Field()
  message: string;
}
