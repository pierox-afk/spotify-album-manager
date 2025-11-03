import { useEffect, useState } from "react";

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const SCOPES = [
  "user-library-read",
  "user-library-modify",
  "user-read-email",
].join(" ");

const STORAGE_TOKEN_KEY = "spotify_token";
const STORAGE_REFRESH_KEY = "spotify_refresh_token";
const STORAGE_STATE_KEY = "spotify_auth_state";
const STORAGE_VERIFIER_KEY = "spotify_code_verifier";

function generateRandomString(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint32Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * Math.random() * chars.length)];
    }
  }
  return result;
}

export function getRedirectUri(): string {
  // Esto asegura que la URI sea correcta tanto en local como en producción.
  return `${window.location.origin}/callback`;
}

/**
 * Lanza al flujo de autorización de Spotify.
 * Asegúrate de que getRedirectUri() esté registrada exactamente en Spotify Dashboard.
 */
export async function redirectToSpotifyAuth(): Promise<void> {
  const redirectUri = getRedirectUri();
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem(STORAGE_STATE_KEY, state);
  localStorage.setItem(STORAGE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem("debug_redirect_uri", redirectUri); // Para depurar

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;

  window.location.href = authUrl;
}

/**
 * Intercambia el `code` recibido en la callback por tokens.
 * Devuelve el objeto con access_token, refresh_token y expires_in para permitir comprobaciones.
 */
export async function getAccessToken(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
} | null> {
  const codeVerifier = localStorage.getItem(STORAGE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error(
      "Code verifier no encontrado. El flujo de autenticación es inválido."
    );
  }

  const redirectUri = getRedirectUri();
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      text || `Error al intercambiar código (status ${resp.status})`
    );
  }

  const data = await resp.json();
  const { access_token, refresh_token, expires_in } = data;

  if (!access_token) {
    throw new Error("No se recibió access_token desde el backend");
  }

  localStorage.setItem(STORAGE_TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(STORAGE_REFRESH_KEY, refresh_token);
  if (expires_in) {
    const expiry = Date.now() + Number(expires_in) * 1000;
    localStorage.setItem("spotify_token_expiry", expiry.toString());
  }

  return { access_token, refresh_token, expires_in };
}

/**
 * Hook simple para obtener token y logout.
 */
export function useAuthContext() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (stored !== token) setToken(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
    localStorage.removeItem(STORAGE_STATE_KEY);
    localStorage.removeItem(STORAGE_VERIFIER_KEY);
    localStorage.removeItem("spotify_token_expiry");
    setToken(null);
  };

  return { token, logout, redirectToSpotifyAuth };
}
