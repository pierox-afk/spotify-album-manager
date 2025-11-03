import { useEffect, useState } from "react";

const SCOPES = [
  "user-library-read",
  "user-library-modify",
  "user-read-email",
].join(" ");

const STORAGE_TOKEN_KEY = "spotify_token";
const STORAGE_REFRESH_KEY = "spotify_refresh_token";
const STORAGE_STATE_KEY = "spotify_auth_state";

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
  const envUri = import.meta.env.VITE_REDIRECT_URI;
  const fallback = `${window.location.origin}/callback`;
  return (envUri ?? fallback).toString();
}

/**
 * Lanza al flujo de autorización de Spotify.
 * Asegúrate de que getRedirectUri() esté registrada exactamente en Spotify Dashboard.
 */
export function redirectToSpotifyAuth(): void {
  const redirectUri = getRedirectUri();
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
  const state = generateRandomString(16);
  localStorage.setItem(STORAGE_STATE_KEY, state);

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  window.location.href = authUrl;
}

/**
 * Intercambia el `code` recibido en la callback por tokens.
 * Nota: este ejemplo asume que tienes un backend en /api/auth/token que hace
 * el intercambio seguro con el client_secret. Si no, ajusta la URL según tu backend.
 */
export async function getAccessToken(code: string): Promise<void> {
  const redirect_uri = getRedirectUri();

  const resp = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri }),
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
    localStorage.removeItem("spotify_token_expiry");
    setToken(null);
  };

  return { token, logout, redirectToSpotifyAuth };
}
