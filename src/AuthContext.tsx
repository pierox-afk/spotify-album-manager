import { useCallback, useState, type ReactNode, useRef } from "react";
import { type TokenData, refreshAccessToken } from "./hooks/useAuth";
import { spotifyFetch as originalSpotifyFetch } from "./spotifyClient";
import { AuthContext, type AuthContextType } from "./hooks/useAuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem("spotify_access_token")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem("spotify_refresh_token")
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    const storedExpiresAt = localStorage.getItem("spotify_expires_at");
    return storedExpiresAt ? parseInt(storedExpiresAt, 10) : null;
  });

  const refreshingPromise = useRef<Promise<string> | null>(null);

  const login = useCallback((tokenData: TokenData) => {
    const { accessToken, refreshToken, expiresIn } = tokenData;
    const expiresAt = new Date().getTime() + expiresIn * 1000;

    localStorage.setItem("spotify_access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("spotify_refresh_token", refreshToken);
    }
    localStorage.setItem("spotify_expires_at", expiresAt.toString());

    setAccessToken(accessToken);
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }
    setExpiresAt(expiresAt);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_expires_at");
    localStorage.removeItem("verifier");
    setAccessToken(null);
    setRefreshToken(null);
    setExpiresAt(null);
    window.location.href = "/";
  }, []);

  const handleRefreshToken = useCallback(async () => {
    if (!refreshToken) {
      logout();
      throw new Error("No refresh token available.");
    }

    if (refreshingPromise.current) {
      return refreshingPromise.current;
    }

    refreshingPromise.current = (async () => {
      try {
        const tokenData = await refreshAccessToken(refreshToken);
        if (tokenData) {
          login(tokenData);
          return tokenData.accessToken;
        }
        logout();
        throw new Error("Failed to refresh token.");
      } catch (error) {
        logout();
        throw error;
      } finally {
        refreshingPromise.current = null;
      }
    })();

    return refreshingPromise.current;
  }, [refreshToken, login, logout]);

  const spotifyFetch = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const callFetch = async (token: string): Promise<T> => {
        try {
          return await originalSpotifyFetch<T>(
            endpoint,
            token,
            options,
            logout
          );
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            error.message.includes("inválido o expirado")
          ) {
            const newAccessToken = await handleRefreshToken();
            return await originalSpotifyFetch<T>(
              endpoint,
              newAccessToken,
              options,
              logout
            );
          }
          throw error;
        }
      };

      let tokenToUse = accessToken;

      if (expiresAt && new Date().getTime() > expiresAt - 60 * 1000) {
        tokenToUse = await handleRefreshToken();
      }

      if (!tokenToUse) {
        logout();
        throw new Error("No access token available. Logging out.");
      }

      return callFetch(tokenToUse);
    },
    [accessToken, expiresAt, handleRefreshToken, logout]
  );

  const contextValue: AuthContextType = {
    token: accessToken,
    login,
    logout,
    spotifyFetch,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
