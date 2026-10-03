import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import type {
  ObjectStorage,
  PresignGetOptions,
  PresignPutOptions,
  StorageObjectMeta,
} from '../../ports/object-storage.port.js';

@Injectable()
export class S3ObjectStorage implements ObjectStorage {
  private readonly storageService: StorageService;

  constructor(private readonly config: ConfigService) {
    this.storageService = new StorageService(this.config);
  }

  async init(): Promise<void> {
    await this.storageService.onModuleInit();
  }

  async presignPut(key: string, options: PresignPutOptions): Promise<string> {
    return this.storageService.presignPut(key, options);
  }

  async presignGet(key: string, options?: PresignGetOptions): Promise<string> {
    return this.storageService.presignGet(key, options);
  }

  async head(key: string): Promise<StorageObjectMeta> {
    return this.storageService.head(key);
  }

  async delete(key: string): Promise<void> {
    await this.storageService.delete(key);
  }
}
