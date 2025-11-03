import { generateCodeVerifier, generateCodeChallenge } from "../lib/pkce";

const SCOPES = [
  "user-read-private",
  "user-library-read",
  "user-library-modify",
];

const getRedirectUri = () =>
  import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/callback`;

export const redirectToSpotifyAuth = async () => {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const redirectUri = getRedirectUri();

  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,

    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
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

/**
 * Asegura que el redirect URI usado en el flujo OAuth
 * sea consistente con la variable de entorno VITE_REDIRECT_URI
 * o con window.location.origin + '/callback' como fallback.
 */
const getRedirectUri = () =>
  import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/callback`;

// Reemplazar donde se construye la URL de autorización para usar getRedirectUri()
const redirectToSpotifyAuth = () => {
  const redirectUri = getRedirectUri();
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const scope = [
    "user-library-read",
    "user-library-modify",
    "user-read-email",
    // ...otros scopes si aplica
  ].join(" ");
  const state = generateRandomString(16); // ...existing helper...
  localStorage.setItem("spotify_auth_state", state);
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId!)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
  window.location.href = authUrl;
};

// En el intercambio de código por token (getAccessToken / handleCallback)
// asegurarse de incluir redirect_uri y manejar errores borrando tokens inválidos:
const exchangeCodeForToken = async (code: string) => {
  const redirectUri = getRedirectUri();
  try {
    // ...existing code que hace fetch al backend o a Spotify...
    // En el body o params de intercambio incluir redirect_uri=redirectUri
  } catch (err) {
    // Si falla el intercambio borra posibles tokens corruptos
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_token_expiry");
    throw err;
  }
};
