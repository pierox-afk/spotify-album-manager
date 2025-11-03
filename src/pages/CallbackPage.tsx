import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../hooks/useAuth";
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
