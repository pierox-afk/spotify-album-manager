const BASE_URL = "https://api.spotify.com/v1";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

export const getRedirectUri = () =>
  import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/callback`;

const getRefreshToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    console.error("No refresh token found");
    return null;
  }

  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(), // Añadido para consistencia
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const { access_token, refresh_token: newRefreshToken } =
      await response.json();
    console.log("Token refreshed. New access token received.");
    localStorage.setItem("spotify_token", access_token);
    if (newRefreshToken) {
      localStorage.setItem("refresh_token", newRefreshToken);
    }
    return access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/"; // Redirige al login
    throw new Error("Could not refresh token.");
  }
};

/**
 * Wrapper para llamadas a la API de Spotify que detecta 401 (token inválido/expirado)
 * y limpia tokens locales lanzando un error con mensaje claro.
 */
export async function spotifyFetch<T>(
  endpoint: string,
  token: string | null,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<T | null> {
  if (!token) {
    throw new Error("Token de Spotify inválido o expirado");
  }

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // limpiar tokens y notificar al caller
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_token_expiry");
    if (typeof onUnauthorized === "function") onUnauthorized();
    throw new Error("Token de Spotify inválido o expirado");
  }

  if (!res.ok) {
    const text = await res.text();
    // Intenta parsear JSON con mensaje de Spotify
    try {
      const json = JSON.parse(text);
      const msg = json.error?.message ?? JSON.stringify(json);
      throw new Error(msg);
    } catch {
      throw new Error(text || "Error desconocido en la API de Spotify");
    }
  }

  const data = await res.json();
  return data as T;
}
