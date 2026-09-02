import crypto from 'crypto';

/**
 * Generates a secure, human-friendly Staff Join Code (e.g., SP-7K9A-3M2Q)
 */
export function generateStaffJoinCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes 0, 1, I, O to prevent transcription errors
  const randomBytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';
  
  for (let i = 0; i < 4; i++) {
    part1 += chars[randomBytes[i] % chars.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += chars[randomBytes[i] % chars.length];
  }

  return `SP-${part1}-${part2}`;
}
