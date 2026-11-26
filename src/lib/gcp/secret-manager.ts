import "server-only";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getServerEnv } from "@/config/env.server";

let cachedClient: SecretManagerServiceClient | null = null;

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

export function maskCredential(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 6)}****${value.slice(-4)}`;
}

/**
 * Stores a secret value in Google Cloud Secret Manager and returns the
 * versioned resource name. Never returns or logs the secret plaintext.
 */
export async function saveSecretValue(
  secretId: string,
  plaintextValue: string
): Promise<string> {
  const env = getServerEnv();
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

  if (!version.name) {
    throw new Error(`Failed to create Secret Manager version for ${secretId}`);
  }

  return version.name;
}

/**
 * Retrieves a secret payload from Google Cloud Secret Manager on the server only.
 */
export async function accessSecretValue(secretReference: string): Promise<string> {
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
