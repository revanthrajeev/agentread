import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for credentials at rest.
 *
 * A GitHub token with push access is the most dangerous thing this product stores, so it
 * is encrypted before it reaches Postgres. A database compromise on its own therefore
 * yields ciphertext, not push access to customer repositories — the key lives only in the
 * server environment. GCM is authenticated, so tampering with stored ciphertext fails to
 * decrypt rather than silently producing a different token.
 */

export interface SealedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
}

function key(): Buffer {
  const secret = process.env.SECRETS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY must be set to at least 32 characters to store GitHub tokens."
    );
  }
  // sha-256 the configured value so any sufficiently long passphrase yields a valid
  // 32-byte key, rather than requiring operators to generate exact key material.
  return createHash("sha256").update(secret).digest();
}

export function isEncryptionConfigured(): boolean {
  const secret = process.env.SECRETS_ENCRYPTION_KEY;
  return !!secret && secret.length >= 32;
}

export function seal(plaintext: string): SealedSecret {
  const iv = randomBytes(12); // 96-bit nonce, the GCM standard
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function open(sealed: SealedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Last four characters, for showing which token is connected without storing it. */
export function hint(plaintext: string): string {
  return `…${plaintext.slice(-4)}`;
}
