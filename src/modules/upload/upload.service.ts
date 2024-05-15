import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import configuration from '@/configs/configuration';
import { getFileName } from '@/utils/helper';

const S3_REGION = 'ap-southeast-1';
const BUCKET_NAME = 'web3-wallet-app';

@Injectable()
export class UploadService {
  logger: Logger;
  constructor() {
    this.logger = new Logger(UploadService.name);
  }

  async uploadFile(
    file: Express.Multer.File,
    options?: {
      bucket?: string;
      prefix?: string;
      input?: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>;
    },
  ) {
    const { bucket = BUCKET_NAME, prefix = '/', input } = options;
    const name = getFileName(file.originalname);
    const s3Client = this.getS3Client();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: prefix + name,
        Body: file.buffer,
        ACL: 'private',
        ...input,
      }),
    );

    this.logger.log(`Upload file :: ${name}`);

    return {
      url: `https://${bucket}.s3.${S3_REGION}.amazonaws.com/${prefix + name}`,
    };
  }

  private getS3Client(region = S3_REGION) {
    const config = configuration();
    return new S3Client({
      region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }
}
