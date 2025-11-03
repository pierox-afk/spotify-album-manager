import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../hooks/useAuth";
import { useAuthContext } from "../hooks/useAuthContext";

const CallbackPage = () => {
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const { login } = useAuthContext();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

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
            throw new Error("Token was not received.");
          }
        } catch (error: unknown) {
          console.error("Error during token fetch:", error);
          navigate("/");
        }
      };
      fetchToken();
    }
  }, [navigate, login]);

  return <div>Cargando...</div>;
};

export default CallbackPage;
