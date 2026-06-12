const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT = 'router_secure_salt_v1';

// Get a consistent 32-byte key derived from the local machine's unique hardware ID
function getHardwareKey() {
  try {
    const hwId = machineIdSync(true); // true = use original id, not hashed
    return crypto.createHash('sha256').update(hwId + SALT).digest();
  } catch (error) {
    // Fallback if machine-id fails (e.g. strict sandbox)
    return crypto.createHash('sha256').update('fallback_local_machine_id' + SALT).digest();
  }
}

// Get a 32-byte key derived from a user's master password
function getPasswordKey(password) {
  return crypto.scryptSync(password, SALT, 32);
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encryptedData (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function decrypt(encryptedBlob, key) {
  try {
    const parts = encryptedBlob.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted blob format');
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    return null; // Decryption failed (wrong key or corrupted)
  }
}

module.exports = {
  getHardwareKey,
  getPasswordKey,
  encrypt,
  decrypt
};
