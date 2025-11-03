import { generateCodeVerifier, generateCodeChallenge } from "../lib/pkce";

const SCOPES = [
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "offline_access",
];

export const redirectToSpotifyAuth = async () => {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  console.log("Redirect URI:", redirectUri);

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

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const getAccessToken = async (
  code: string
): Promise<TokenData | null> => {
  const verifier = localStorage.getItem("verifier");
  if (!verifier) {
    throw new Error("Code verifier not found!");
  }

  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;

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

    const { access_token, refresh_token, expires_in } = await response.json();
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<TokenData | null> => {
  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
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
        `Failed to refresh access token: ${errorData.error_description}`
      );
    }

    const { access_token, refresh_token, expires_in } = await response.json();
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
