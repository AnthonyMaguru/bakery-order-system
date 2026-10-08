import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../config/env.js";

export const firebaseConfigured = Boolean(env.GOOGLE_APPLICATION_CREDENTIALS);

// Initialised lazily so the server can start without credentials during local development.
function firebaseApp() {
  if (!firebaseConfigured) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set; Firebase is unavailable");
  }
  return getApps()[0] ?? initializeApp({ credential: applicationDefault() });
}

export const firebaseAuth = () => getAuth(firebaseApp());
export const firebaseMessaging = () => getMessaging(firebaseApp());
