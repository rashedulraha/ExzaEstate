import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { FileRejectedException } from './storage.exceptions.js';

export interface PresignPutOptions {
  mimeType: string;
  sizeBytes?: number;
  maxSizeBytes?: number;
  expiresInSeconds?: number;
}

export interface PresignGetOptions {
  expiresInSeconds?: number;
}

export interface StorageObjectMeta {
  size: number;
  contentType?: string;
}

const DEFAULT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('STORAGE_BUCKET');

    this.s3Client = new S3Client({
      endpoint: this.config.get('STORAGE_ENDPOINT'),
      region: this.config.get('STORAGE_REGION'),
      credentials: {
        accessKeyId: this.config.get('STORAGE_ACCESS_KEY'),
        secretAccessKey: this.config.get('STORAGE_SECRET_KEY'),
      },
      forcePathStyle: this.config.get('STORAGE_FORCE_PATH_STYLE'),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  /**
   * Ensures the configured storage bucket exists (useful for MinIO local dev and test environments).
   */
  async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        // If already exists or error, ignore if bucket is accessible
      }
    }
  }

  /**
   * Generates a pre-signed URL for client direct upload (PUT).
   * Validates MIME type and size limit before issuing URL.
   */
  async presignPut(key: string, options: PresignPutOptions): Promise<string> {
    const { mimeType, sizeBytes, maxSizeBytes, expiresInSeconds = 900 } = options;

    if (!DEFAULT_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new FileRejectedException(`MIME type '${mimeType}' is not allowed`, {
        mimeType,
        allowedMimeTypes: Array.from(DEFAULT_ALLOWED_MIME_TYPES),
      });
    }

    const maxAllowed = maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
    if (sizeBytes !== undefined && sizeBytes > maxAllowed) {
      throw new FileRejectedException(
        `File size (${sizeBytes} bytes) exceeds maximum allowed size of ${maxAllowed} bytes`,
        { sizeBytes, maxSizeBytes: maxAllowed },
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generates a pre-signed URL for direct download (GET).
   */
  async presignGet(key: string, options?: PresignGetOptions): Promise<string> {
    const expiresIn = options?.expiresInSeconds ?? 900;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Retrieves metadata of an object in storage.
   */
  async head(key: string): Promise<StorageObjectMeta> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const res = await this.s3Client.send(command);
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType,
    };
  }

  /**
   * Deletes an object from storage.
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
