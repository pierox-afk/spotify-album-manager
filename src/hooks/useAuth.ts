import { generateCodeVerifier, generateCodeChallenge } from "../lib/pkce";

const SCOPES = [
  "user-read-private",
  "user-library-read",
  "user-library-modify",
];

export const redirectToSpotifyAuth = async () => {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const redirectUri = `${window.location.origin}/callback`;
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

export const getAccessToken = async (code: string): Promise<string | null> => {
  const verifier = localStorage.getItem("verifier");
  if (!verifier) {
    throw new Error("Code verifier not found!");
  }

  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
  const redirectUri = `${window.location.origin}/callback`;

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

    const { access_token } = await response.json();
    return access_token;
  } catch (error) {
    console.error(error);
    return null;
  }
};
