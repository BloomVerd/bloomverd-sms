import { registerEnumType } from '@nestjs/graphql';

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
