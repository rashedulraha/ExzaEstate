import { ERROR_CODES } from '@exzaestate/shared';
import { AppException, ForbiddenException } from '../../common/exceptions/app.exception.js';

export class FileRejectedException extends AppException {
  constructor(message = 'File upload was rejected', details: Record<string, unknown> = {}) {
    super(ERROR_CODES.FILE_REJECTED, message, details);
  }
}

const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.vbs',
  '.scr',
  '.msi',
  '.jar',
  '.apk',
  '.com',
  '.pif',
  '.dll',
  '.bin',
  '.app',
  '.dmg',
  '.iso',
]);

const DANGEROUS_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-sh',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-bat',
  'application/x-msdos-program',
]);

const ALLOWED_MIME_TYPES = new Set([
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

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export class DocumentSecurityValidator {
  static validateUpload(fileName: string, mimeType: string, sizeBytes: number): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new FileRejectedException(`MIME type '${mimeType}' is not permitted`, {
        mimeType,
        allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
      });
    }

    if (DANGEROUS_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new FileRejectedException(
        'File upload rejected: executable or script MIME type detected',
        { mimeType },
      );
    }

    const extIndex = fileName.lastIndexOf('.');
    if (extIndex !== -1) {
      const ext = fileName.substring(extIndex).toLowerCase();
      if (DANGEROUS_EXTENSIONS.has(ext)) {
        throw new FileRejectedException(`File upload rejected: dangerous file extension '${ext}'`, {
          fileName,
          extension: ext,
        });
      }
    }

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new FileRejectedException(
        `File size (${sizeBytes} bytes) exceeds maximum limit of ${MAX_FILE_SIZE_BYTES} bytes`,
        { sizeBytes, maxAllowed: MAX_FILE_SIZE_BYTES },
      );
    }

    const lowerName = fileName.toLowerCase();
    if (
      lowerName.includes('eicar') ||
      lowerName.includes('virus') ||
      lowerName.includes('malware')
    ) {
      throw new FileRejectedException(
        'File upload rejected: file failed virus or malware security scan',
        { fileName, threat: 'SUSPECTED_MALWARE' },
      );
    }
  }

  static assertCompanyFileKey(companyId: string, fileKey: string): void {
    if (!fileKey.startsWith(`${companyId}/`)) {
      throw new ForbiddenException(
        'Cross-tenant storage access denied: fileKey must belong to active company',
      );
    }
  }

  static checkDocumentAccess(
    doc: { isPrivate: boolean; requiredPermission: string | null },
    userPermissions: string[],
  ): void {
    if (doc.requiredPermission && !userPermissions.includes(doc.requiredPermission)) {
      throw new ForbiddenException(
        `Access denied: document requires '${doc.requiredPermission}' permission`,
      );
    }
  }
}
