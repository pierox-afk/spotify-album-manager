import { generateCodeVerifier, generateCodeChallenge } from "../lib/pkce";

const SCOPES = [
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "user-read-email",
];

const getRedirectUri = () =>
  import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/callback`;

/**
 * Retorna la redirect URI única usada por la app.
 * Debe coincidir exactamente con la registrada en Spotify Dashboard.
 */
export const getRedirectUri = (): string => {
  const envUri = import.meta.env.VITE_REDIRECT_URI;
  const fallback = `${window.location.origin}/callback`;
  return (envUri ?? fallback).toString();
}

/** Valida que exista una redirect URI y la imprime para depuración */
function assertRedirectUri() {
  const uri = getRedirectUri();
  if (!uri) {
    console.error(
      "VITE_REDIRECT_URI no está configurada. Añade VITE_REDIRECT_URI en .env y registra EXACTAMENTE esa URI en Spotify Dashboard."
    );
    throw new Error("redirect_uri no configurada");
  }
  console.info("Usando redirect URI:", uri);
}

/** Generador simple de estado aleatorio */
function generateRandomString(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint32Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i++) result += chars[values[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * Math.random() * chars.length)];
  }
  return result;
}

/** Redirige al usuario al auth de Spotify (usa getRedirectUri) */
export const redirectToSpotifyAuth = () => {
  assertRedirectUri();
  const redirectUri = getRedirectUri();
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "";
  const scope = [
    "user-library-read",
    "user-library-modify",
    "user-read-email",
  ].join(" ");
  const state = generateRandomString(16);
  localStorage.setItem("spotify_auth_state", state);
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
  window.location.href = authUrl;
};

export const getAccessToken = async (code: string): Promise<string | null> => {
  const verifier = localStorage.getItem("verifier");
  if (!verifier) {
    throw new Error("Code verifier not found!");
  }

  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to fetch access token: ${errorData.error_description}`
      );
    }

    const { access_token, refresh_token } = await response.json();
    if (refresh_token) {
      localStorage.setItem("refresh_token", refresh_token);
    }
    if (access_token) {
      localStorage.setItem("spotify_token", access_token);
    }
    return access_token;
  } catch (error) {
    console.error(error);
    return null;
  }
};
