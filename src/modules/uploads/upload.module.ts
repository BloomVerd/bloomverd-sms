import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadToAwsProvider } from './upload-to-aws.provider';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [UploadToAwsProvider],
  exports: [UploadToAwsProvider],
})
export class UploadModule {}
