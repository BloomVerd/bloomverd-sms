import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as path from 'path';
import { MetricsService } from 'src/shared/services/metrics.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadToAwsProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  public async fileupload(file: Express.Multer.File) {
    const s3 = new S3();
    const fileType = this.getFileType(file.mimetype);

    try {
      const uploadResult = await s3
        .upload({
          Bucket:
            this.configService.get<string>('AWS_PUBLIC_BUCKET_NAME') || '',
          Body: file.buffer,
          Key: this.generateFileName(file),
          ContentType: file.mimetype,
        })
        .promise(); // Promisify the request

      // Track successful upload
      this.metricsService.trackFileUpload(fileType, true);
      this.metricsService.trackFileUploadSize(fileType, file.size);

      // Return the file name
      return uploadResult.Key;
    } catch (error) {
      // Track failed upload
      this.metricsService.trackFileUpload(fileType, false);
      throw new RequestTimeoutException(error);
    }
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel'))
      return 'spreadsheet';
    if (mimetype.includes('document') || mimetype.includes('word'))
      return 'document';
    return 'other';
  }

  private generateFileName(file: Express.Multer.File) {
    // extract file name
    const name = file.originalname.split('.')[0];
    // Remove spaces in the file name
    name.replace(/\s/g, '').trim();
    // extract file extension
    const extension = path.extname(file.originalname);
    // Generate a timestamp
    const timeStamp = new Date().getTime().toString().trim();
    // Return new fileName
    return `${name}-${timeStamp}-${uuidv4()}${extension}`;
  }
}
