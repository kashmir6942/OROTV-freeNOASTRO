import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CHANNEL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encryptChannelUrl(url: string, channelId: string): {
  encrypted: string;
  iv: string;
  authTag: string;
  channelId: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(url, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    channelId,
  };
}

export function decryptChannelUrl(encrypted: string, iv: string, authTag: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed - invalid credentials');
  }
}

export function generateRequestToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateRequestToken(token: string, storedHash: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedHash),
  );
}
