import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getClientEnv } from "@/config/env.client";

let appCheckInitialized = false;

export function isFirebaseClientConfigured(): boolean {
  const env = getClientEnv();
  return Boolean(
    env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const env = getClientEnv();

  if (!env.NEXT_PUBLIC_FIREBASE_API_KEY || !env.NEXT_PUBLIC_FIREBASE_APP_ID) {
    throw new Error(
      "Firebase Client SDK is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }

  return initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    ...(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      ? { authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }
      : {}),
    ...(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      ? { storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }
      : {}),
    ...(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
    ...(env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
      ? { measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
      : {}),
  });
}

export function getClientAuth(): Auth {
  const app = getFirebaseClientApp();
  initBrowserAppCheck(app);
  return getAuth(app);
}

export function getClientFirestore(): Firestore {
  const app = getFirebaseClientApp();
  return getFirestore(app);
}

function initBrowserAppCheck(app: FirebaseApp): void {
  if (typeof window === "undefined" || appCheckInitialized) {
    return;
  }

  const env = getClientEnv();
  if (!env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY) {
    return;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckInitialized = true;
}

/**
 * Initializes Firebase Analytics strictly in supported browser environments.
 * Never executes during server-side rendering.
 */
export async function initAnalyticsIfSupported(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const env = getClientEnv();
  if (!env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || !isFirebaseClientConfigured()) {
    return;
  }

  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) {
    getAnalytics(getFirebaseClientApp());
  }
}
