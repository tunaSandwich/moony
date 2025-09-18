import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encrypt(text: string, key: string): string {
  // Ensure key is exactly 32 bytes for AES-256
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher with IV
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Combine IV and encrypted data
  const result = iv.toString('hex') + ':' + encrypted;
  
  return result;
}

export function decrypt(encryptedData: string, key: string): string {
  try {
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher with IV
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
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