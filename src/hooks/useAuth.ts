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
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export function getRedirectUri(): string {
  const envUri = import.meta.env.VITE_REDIRECT_URI;
  const fallback = `${window.location.origin}/callback`;
  return (envUri ?? fallback).toString();
}

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
    setToken(null);
    // opcional: redirigir a inicio o forzar flujo de login
  };

  return { token, logout, redirectToSpotifyAuth };
}
