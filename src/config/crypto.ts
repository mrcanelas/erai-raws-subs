import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
// Fixed salt keeps key derivation deterministic across restarts. The real
// secret entropy comes from CONFIG_SECRET.
const KEY_SALT = "erai-raws-subs.config.v1";

export class ConfigSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigSecretError";
  }
}

function deriveKey(): Buffer {
  const secret = process.env.CONFIG_SECRET?.trim();
  if (!secret) {
    throw new ConfigSecretError(
      "CONFIG_SECRET must be set to store or read addon credentials",
    );
  }
  return scryptSync(secret, KEY_SALT, 32);
}

export type EncryptedPayload = {
  secret: string;
  iv: string;
  authTag: string;
};

export function encryptJson(value: unknown): EncryptedPayload {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    secret: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  const key = deriveKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.secret, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}

export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isConfigSecretConfigured(): boolean {
  return Boolean(process.env.CONFIG_SECRET?.trim());
}
