import { scryptSync, randomBytes } from 'crypto';

/**
 * Hash a password using scrypt with a random salt.
 * Returns hex-encoded hash and salt.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Verify a password against a stored hash + salt.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64).toString('hex');
  return candidate === hash;
}
