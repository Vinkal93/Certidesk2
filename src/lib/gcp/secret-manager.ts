import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getServerEnv } from "@/config/env.server";
import { getAdminFirestore } from "@/lib/firebase/admin";

let cachedClient: SecretManagerServiceClient | null = null;
const ENCRYPTED_VAULT_COLLECTION = "encryptedGatewaySecrets";
const VAULT_PREFIX = "vault://";

function getSecretManagerClient(): SecretManagerServiceClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  const clientEmail = env.GCP_SECRET_MANAGER_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.GCP_SECRET_MANAGER_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    cachedClient = new SecretManagerServiceClient({
      projectId: env.GCP_PROJECT_ID,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  } else {
    // Uses Application Default Credentials (Workload Identity / Cloud Run / GCE)
    cachedClient = new SecretManagerServiceClient({
      projectId: env.GCP_PROJECT_ID,
    });
  }

  return cachedClient;
}

function deriveVaultKey(): Buffer {
  const env = getServerEnv();
  const keyMaterial =
    process.env.GATEWAY_ENCRYPTION_KEY ||
    env.FIREBASE_PRIVATE_KEY ||
    env.GCP_SECRET_MANAGER_PRIVATE_KEY ||
    `${env.FIREBASE_PROJECT_ID}:${env.GCP_PROJECT_ID}:certidesk-vault`;
  return createHash("sha256").update(keyMaterial, "utf8").digest();
}

export function encryptSecretPayload(plaintext: string): {
  iv: string;
  authTag: string;
  ciphertext: string;
} {
  const key = deriveVaultKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptSecretPayload(payload: {
  iv: string;
  authTag: string;
  ciphertext: string;
}): string {
  const key = deriveVaultKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskCredential(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 6)}****${value.slice(-4)}`;
}

/**
 * Stores a secret value in Google Cloud Secret Manager when available,
 * and falls back to an AES-256-GCM encrypted server-only Firestore vault
 * when Secret Manager API/IAM is not configured.
 */
export async function saveSecretValue(
  secretId: string,
  plaintextValue: string
): Promise<string> {
  const env = getServerEnv();

  try {
    const client = getSecretManagerClient();
    const parent = `projects/${env.GCP_PROJECT_ID}`;
    const secretName = `${parent}/secrets/${secretId}`;

    try {
      await client.getSecret({ name: secretName });
    } catch {
      await client.createSecret({
        parent,
        secretId,
        secret: {
          replication: { automatic: {} },
        },
      });
    }

    const [version] = await client.addSecretVersion({
      parent: secretName,
      payload: {
        data: Buffer.from(plaintextValue, "utf8"),
      },
    });

    if (version.name) {
      return version.name;
    }
  } catch {
    // Fall back to AES-256-GCM encrypted Firestore vault below
  }

  const db = getAdminFirestore();
  const encrypted = encryptSecretPayload(plaintextValue);
  const now = new Date().toISOString();
  const ref = db.collection(ENCRYPTED_VAULT_COLLECTION).doc(secretId);
  const existing = await ref.get();
  const nextVersion =
    typeof existing.data()?.version === "number"
      ? (existing.data()!.version as number) + 1
      : 1;

  await ref.set({
    id: secretId,
    version: nextVersion,
    algorithm: "aes-256-gcm",
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    ciphertext: encrypted.ciphertext,
    updatedAt: now,
  });

  return `${VAULT_PREFIX}${ENCRYPTED_VAULT_COLLECTION}/${secretId}/v${nextVersion}`;
}

/**
 * Retrieves a secret payload from either Google Cloud Secret Manager or the
 * AES-256-GCM encrypted Firestore vault on the server only.
 */
export async function accessSecretValue(secretReference: string): Promise<string> {
  if (secretReference.startsWith(VAULT_PREFIX)) {
    const parts = secretReference.slice(VAULT_PREFIX.length).split("/");
    const secretId = parts[1];
    if (!secretId) {
      throw new Error("Invalid encrypted vault secret reference.");
    }
    const db = getAdminFirestore();
    const snap = await db.collection(ENCRYPTED_VAULT_COLLECTION).doc(secretId).get();
    const data = snap.data() as
      { iv?: string; authTag?: string; ciphertext?: string } | undefined;
    if (!snap.exists || !data?.iv || !data.authTag || !data.ciphertext) {
      throw new Error("Encrypted vault secret not found.");
    }
    return decryptSecretPayload({
      iv: data.iv,
      authTag: data.authTag,
      ciphertext: data.ciphertext,
    });
  }

  const client = getSecretManagerClient();
  const [version] = await client.accessSecretVersion({
    name: secretReference,
  });

  const payload = version.payload?.data;
  if (!payload) {
    throw new Error("Secret Manager returned an empty payload.");
  }

  return typeof payload === "string" ? payload : Buffer.from(payload).toString("utf8");
}
