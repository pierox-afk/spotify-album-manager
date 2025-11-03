import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken, getRedirectUri } from "../hooks/useAuth";
import { useAuthContext } from "../hooks/useAuthContext";

const CallbackPage = () => {
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const { login } = useAuthContext();
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      setDebugInfo(`Error de Spotify: ${error}`);
      return;
    }

    const storedRedirectUri = localStorage.getItem("debug_redirect_uri");
    const currentRedirectUri = getRedirectUri();

    if (storedRedirectUri !== currentRedirectUri) {
      setDebugInfo(
        `¡ERROR DE REDIRECCIÓN! Las URLs no coinciden:\n\n` +
          `URL al iniciar sesión:\n${storedRedirectUri}\n\n` +
          `URL en la página de callback:\n${currentRedirectUri}`
      );
      return;
    }

    if (code) {
      const fetchToken = async () => {
        if (hasFetched.current) {
          return;
        }
        hasFetched.current = true;
        try {
          const token = await getAccessToken(code);
          if (token) {
            login(token.access_token);
            navigate("/search", { replace: true });
          } else {
            throw new Error("El token no fue recibido de Spotify.");
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Error desconocido";
          setDebugInfo(errorMessage);
        }
      };
      fetchToken();
    }
  }, [navigate, login]);

  if (debugInfo) {
    return (
      <div style={{ padding: "20px", whiteSpace: "pre-wrap" }}>
        <h1>Información de Depuración</h1>
        <p>{debugInfo}</p>
      </div>
    );
  }

  return <div>Cargando...</div>;
};

export default CallbackPage;
