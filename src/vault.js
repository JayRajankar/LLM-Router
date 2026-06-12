const fs = require('fs');
const path = require('path');
const cryptoUtils = require('./crypto');

const VAULT_PATH = path.join(process.cwd(), 'vault.enc');
const ENV_PATH = path.join(process.cwd(), '.env');

let locked = false;
let currentMode = 'hardware'; // 'hardware' or 'password'
let activeKeys = {};
let activeEncryptionKey = null;

function initVault() {
  if (!fs.existsSync(VAULT_PATH)) {
    // Migration: Extract keys from .env
    const envKeys = {};
    if (fs.existsSync(ENV_PATH)) {
      let envContent = fs.readFileSync(ENV_PATH, 'utf8');
      const lines = envContent.split('\n');
      const newLines = [];
      let changed = false;

      lines.forEach(line => {
        const match = line.match(/^([A-Z0-9_]+(?:_KEY|_TOKEN)(?:_\d+)?)=(.*)$/);
        if (match) {
          envKeys[match[1]] = match[2].trim();
          changed = true;
        } else {
          newLines.push(line);
        }
      });

      if (changed) {
        fs.writeFileSync(ENV_PATH, newLines.join('\n').trim() + '\n', 'utf8');
      }
    }
    
    activeKeys = envKeys;
    activeEncryptionKey = cryptoUtils.getHardwareKey();
    saveVault(activeEncryptionKey, 'hardware');
    locked = false;
    currentMode = 'hardware';
    return;
  }

  // Load existing vault
  const raw = fs.readFileSync(VAULT_PATH, 'utf8');
  try {
    const vaultData = JSON.parse(raw);
    currentMode = vaultData.mode;
    
    if (currentMode === 'hardware') {
      activeEncryptionKey = cryptoUtils.getHardwareKey();
      const decrypted = cryptoUtils.decrypt(vaultData.encrypted, activeEncryptionKey);
      if (decrypted) {
        activeKeys = JSON.parse(decrypted);
        locked = false;
      } else {
        // Hardware mismatch or corrupted
        locked = true; 
      }
    } else if (currentMode === 'password') {
      locked = true; // Wait for user to unlock
    }
  } catch (e) {
    locked = true;
  }
}

function saveVault(encryptionKey, mode) {
  const text = JSON.stringify(activeKeys);
  const encrypted = cryptoUtils.encrypt(text, encryptionKey);
  const data = { mode, encrypted };
  fs.writeFileSync(VAULT_PATH, JSON.stringify(data), 'utf8');
  currentMode = mode;
  activeEncryptionKey = encryptionKey;
}

function unlockVault(password) {
  if (!fs.existsSync(VAULT_PATH)) return false;
  
  const raw = fs.readFileSync(VAULT_PATH, 'utf8');
  const vaultData = JSON.parse(raw);
  
  if (vaultData.mode !== 'password') return false;
  
  const key = cryptoUtils.getPasswordKey(password);
  const decrypted = cryptoUtils.decrypt(vaultData.encrypted, key);
  
  if (decrypted) {
    activeKeys = JSON.parse(decrypted);
    activeEncryptionKey = key;
    locked = false;
    return true;
  }
  return false;
}

function setMasterPassword(newPassword) {
  if (locked) throw new Error("Vault is currently locked. Unlock first.");
  if (!newPassword) {
    // Revert to hardware mode
    saveVault(cryptoUtils.getHardwareKey(), 'hardware');
  } else {
    // Switch to password mode
    saveVault(cryptoUtils.getPasswordKey(newPassword), 'password');
  }
}

function updateKeys(newKeyPairs) {
  if (locked) throw new Error("Vault is currently locked.");
  let changed = false;
  for (const [k, v] of Object.entries(newKeyPairs)) {
    if (v === '') {
      // Empty string means delete the key
      if (activeKeys[k] !== undefined) {
        delete activeKeys[k];
        changed = true;
      }
    } else if (activeKeys[k] !== v) {
      activeKeys[k] = v;
      changed = true;
    }
  }
  
  if (changed) {
    saveVault(activeEncryptionKey, currentMode);
  }
}

function getKeys() {
  return locked ? {} : activeKeys;
}

function isLocked() {
  return locked;
}

function getMode() {
  return currentMode;
}

// Ensure vault is initialized on load
initVault();

module.exports = {
  getKeys,
  isLocked,
  getMode,
  unlockVault,
  setMasterPassword,
  updateKeys
};
