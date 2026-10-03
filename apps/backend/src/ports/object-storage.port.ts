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

/**
 * ObjectStorage Port
 * File upload/download presigning and lifecycle management.
 * Implemented by S3ObjectStorage in Cloud mode, and FsObjectStorage in Local mode.
 */
export interface ObjectStorage {
  presignPut(key: string, options: PresignPutOptions): Promise<string>;
  presignGet(key: string, options?: PresignGetOptions): Promise<string>;
  head(key: string): Promise<StorageObjectMeta>;
  delete(key: string): Promise<void>;
  upload?(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
}
