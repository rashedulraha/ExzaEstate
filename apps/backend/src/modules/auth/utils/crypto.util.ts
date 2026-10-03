import crypto from 'node:crypto';

export class CryptoUtil {
  /**
   * Encrypts plaintext using AES-256-GCM.
   * Format: ivHex:authTagHex:ciphertextHex
   */
  static encrypt(plaintext: string, secretKey: string): string {
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext produced by AES-256-GCM.
   */
  static decrypt(ciphertextPayload: string, secretKey: string): string {
    const parts = ciphertextPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted ciphertext format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
