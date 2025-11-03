import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import type { Album } from "../spotify";
import { AlbumGrid } from "../components/AlbumGrid";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import "../components/Page.css";

interface SavedAlbumsResponse {
  items: { added_at: string; album: Album }[];
}

export default function MyAlbumsPage() {
  const { token, logout } = useAuthContext();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedAlbums = async () => {
      if (!token) return;

      try {
        const data = await spotifyFetch<SavedAlbumsResponse>(
          "/me/albums?limit=50",
          token
        );
        if (data) {
          const savedAlbums = data.items.map((item) => item.album);
          setAlbums(savedAlbums);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        if (err instanceof Error && err.message.includes("expirado")) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedAlbums();
  }, [token, logout]);

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (error) return <Message type="error" text={`Error: ${error}`} />;
    if (albums.length === 0)
      return <Message text="No tienes álbumes guardados. ¡Empieza a buscar!" />;
    return <AlbumGrid albums={albums} />;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Mis Álbumes</h1>
        <Link to="/search">Ir a Búsqueda</Link>
      </header>
      <main>{renderContent()}</main>
    </div>
  );
}
