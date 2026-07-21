/**
 * Generates a validly formatted Stellar Ed25519 Public Key (starts with G, 56 characters, Base32).
 * Useful for demo/testing when users don't have a specific public key handy.
 */
export function generateSampleStellarAddress(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let address = "G";
  for (let i = 0; i < 55; i++) {
    address += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return address;
}
