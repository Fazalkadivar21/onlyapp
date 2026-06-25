import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const ivBytes = 12;
const authTagBytes = 16;
const version = "v1";

export type EncryptedSecret = `${typeof version}:${string}`;

export function encryptSecret(payload: unknown, encryptionKey = process.env.ENCRYPTION_KEY): EncryptedSecret {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(ivBytes);
  const cipher = createCipheriv(algorithm, key, iv, { authTagLength: authTagBytes });
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${version}:${Buffer.concat([iv, authTag, ciphertext]).toString("base64url")}`;
}

export function decryptSecret<T = unknown>(encryptedPayload: string, encryptionKey = process.env.ENCRYPTION_KEY): T {
  const key = deriveKey(encryptionKey);
  const [payloadVersion, encoded] = encryptedPayload.split(":");

  if (payloadVersion !== version || !encoded) {
    throw new Error("Unsupported encrypted secret format");
  }

  const payload = Buffer.from(encoded, "base64url");
  if (payload.length <= ivBytes + authTagBytes) {
    throw new Error("Invalid encrypted secret payload");
  }

  const iv = payload.subarray(0, ivBytes);
  const authTag = payload.subarray(ivBytes, ivBytes + authTagBytes);
  const ciphertext = payload.subarray(ivBytes + authTagBytes);
  const decipher = createDecipheriv(algorithm, key, iv, { authTagLength: authTagBytes });
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

function deriveKey(encryptionKey: string | undefined) {
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY is required");
  }

  if (encryptionKey.startsWith("base64:")) {
    const key = Buffer.from(encryptionKey.slice("base64:".length), "base64");
    if (key.length === 32) return key;
  }

  if (/^[a-f0-9]{64}$/i.test(encryptionKey)) {
    return Buffer.from(encryptionKey, "hex");
  }

  return createHash("sha256").update(encryptionKey).digest();
}
