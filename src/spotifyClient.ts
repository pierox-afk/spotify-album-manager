const BASE_URL = "https://api.spotify.com/v1";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

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
    return null;
  }
};

export const spotifyFetch = async <T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<T | null> => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const newToken = await getRefreshToken();
      if (newToken) {
        // Reintenta la llamada con el nuevo token
        return spotifyFetch(endpoint, newToken, options, onUnauthorized);
      } else {
        throw new Error("Token de Spotify inválido o expirado.");
      }
    }
    if (response.status === 403) {
      onUnauthorized?.();
      throw new Error("Usuario no autorizado para usar esta aplicación.");
    }
    const errorData = await response.json();
    throw new Error(
      `Error de la API de Spotify: ${
        errorData.error.message || response.statusText
      }`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const method = options.method?.toUpperCase();
  if ((method === "PUT" || method === "DELETE") && response.ok) {
    return null as T;
  }

  return response.json();
};
