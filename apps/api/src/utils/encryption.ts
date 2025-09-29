import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12;

export function encrypt(text: string, key: string): string {
  // Ensure key is exactly 32 bytes for AES-256
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  
  // Generate random 12-byte nonce for GCM
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  
  // Create cipher with nonce
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, nonce);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Get the authentication tag
  const tag = cipher.getAuthTag();
  
  // Format: nonce_base64:ciphertext_base64:tag_base64
  const result = nonce.toString('base64') + ':' + encrypted.toString('base64') + ':' + tag.toString('base64');
  
  return result;
}

export function decrypt(encryptedData: string, key: string): string {
  try {
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    // Split the encrypted data: nonce_base64:ciphertext_base64:tag_base64
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const nonce = Buffer.from(parts[0], 'base64');
    const encrypted = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    
    // Create decipher with nonce
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, nonce);
    
    // Set the authentication tag
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

// Utility function to validate encryption key
export function validateEncryptionKey(key: string): boolean {
  try {
    // Validate key format and length requirements
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return false;
    }
    
    // Test encryption/decryption with the key
    const testData = 'test-encryption-validation';
    const encrypted = encrypt(testData, key);
    const decrypted = decrypt(encrypted, key);
    return decrypted === testData;
  } catch {
    return false;
  }
}