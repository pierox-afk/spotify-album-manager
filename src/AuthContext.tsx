import { useCallback, useState, type ReactNode } from "react";
import { AuthContext } from "./hooks/useAuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("spotify_token")
  );

  const login = useCallback((newToken: string) => {
    localStorage.setItem("spotify_token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("verifier");
    setToken(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
