import fs from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import type {
  ObjectStorage,
  PresignGetOptions,
  PresignPutOptions,
  StorageObjectMeta,
} from '../../ports/object-storage.port.js';

@Injectable()
export class FsObjectStorage implements ObjectStorage {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.local-storage');
  }

  private getFilePath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async presignPut(key: string, _options: PresignPutOptions): Promise<string> {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    return `file://${filePath}?key=${encodeURIComponent(key)}`;
  }

  async presignGet(key: string, _options?: PresignGetOptions): Promise<string> {
    const filePath = this.getFilePath(key);
    return `file://${filePath}?key=${encodeURIComponent(key)}`;
  }

  async head(key: string): Promise<StorageObjectMeta> {
    const filePath = this.getFilePath(key);
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        contentType: 'application/octet-stream',
      };
    } catch {
      throw new Error(`Object not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if not exists
    }
  }

  async upload(key: string, body: Buffer | Uint8Array, _contentType: string): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }
}
