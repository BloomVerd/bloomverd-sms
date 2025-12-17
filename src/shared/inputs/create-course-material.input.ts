import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCourseMaterialInput {
  @Field()
  materialName: string;

  @Field()
  materialUrl: string;
}
