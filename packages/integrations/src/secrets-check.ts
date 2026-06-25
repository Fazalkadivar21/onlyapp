import { decryptSecret, encryptSecret } from "./secrets";

const key = "dev-only-secret-key-for-local-validation";
const original = { accessToken: "xoxb-example", nested: { ok: true } };
const encrypted = encryptSecret(original, key);
const decrypted = decryptSecret<typeof original>(encrypted, key);

if (encrypted.includes(original.accessToken)) {
  throw new Error("Encrypted payload leaked plaintext");
}

if (decrypted.accessToken !== original.accessToken || decrypted.nested.ok !== true) {
  throw new Error("Secret encryption roundtrip failed");
}

console.log("Secret encryption roundtrip passed.");
