import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../hooks/useAuth";
import { useAuthContext } from "../hooks/useAuthContext";

const CallbackPage = () => {
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const { login } = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setError(`Error de Spotify: ${errorParam}`);
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
            login(token);
            navigate("/search", { replace: true });
          } else {
            throw new Error("El token no fue recibido de Spotify.");
          }
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Error desconocido";
          console.error("Error al obtener el token:", err);
          setError(errorMessage);
        }
      };
      fetchToken();
    }
  }, [navigate, login]);

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h1>Error de Autenticación</h1>
        <p>{error}</p>
        <p>
          Por favor, asegúrate de que la URI de redirección en tu Spotify
          Developer Dashboard es correcta y que la variable de entorno
          VITE_SPOTIFY_CLIENT_ID está bien configurada en Vercel.
        </p>
      </div>
    );
  }

  return <div>Cargando...</div>;
};

export default CallbackPage;
