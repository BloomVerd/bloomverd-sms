import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  PDF = 'pdf',
  PPT = 'ppt',
}

registerEnumType(FileType, {
  name: 'FileType',
  description: 'File type of entity',
});

@ObjectType('CourseMaterial')
export class CourseMaterialTypeClass {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  url: string;

  @Field()
  size: number;

  @Field(() => FileType)
  type: FileType;

  @Field()
  mime: string;
}
