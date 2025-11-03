const BASE_URL = "https://api.spotify.com/v1";

/**
 * Wrapper para llamadas a la API de Spotify.
 * Usa BASE_URL para construir la URL y evita variables sin usar.
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

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_token_expiry");
    if (typeof onUnauthorized === "function") onUnauthorized();
    throw new Error("Token de Spotify inválido o expirado");
  }

  if (!res.ok) {
    const text = await res.text();
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
