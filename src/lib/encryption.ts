import CryptoJS from 'crypto-js';

export function encryptMessage(message: string, key: string): string {
  return CryptoJS.AES.encrypt(message, key).toString();
}

export function decryptMessage(encryptedMessage: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateEncryptionKey(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return CryptoJS.SHA256(sortedIds.join('-')).toString();
}
