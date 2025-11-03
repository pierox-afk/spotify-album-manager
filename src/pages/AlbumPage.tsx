import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import { Header } from "../components/Header";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import type { Album, Track } from "../spotify";
import "./AlbumPage.css";

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthContext();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    const fetchAlbumDetails = async () => {
      try {
        setLoading(true);
        const albumDetails = await spotifyFetch<Album>(`/albums/${id}`, token);
        setAlbum(albumDetails);

        const tracksData = await spotifyFetch<{ items: Track[] }>(
          `/albums/${id}/tracks`,
          token
        );
        if (tracksData) {
          setTracks(tracksData.items);
        }
      } catch (err) {
        setError("No se pudieron cargar los detalles del álbum.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumDetails();
  }, [id, token]);

  const playTrack = (trackId: string) => {
    setCurrentTrack(trackId);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, "0")}`;
  };

  if (loading) return <Spinner />;
  if (error) return <Message type="error" text={error} />;
  if (!album) return <Message text="Álbum no encontrado." />;

  return (
    <div className="page-container">
      <Header />
      <main>
        <div className="album-details-header">
          <img
            src={album.images[0]?.url}
            alt={album.name}
            className="album-details-image"
          />
          <div className="album-details-info">
            <h1>{album.name}</h1>
            <p>de {album.artists.map((artist) => artist.name).join(", ")}</p>
            <p>
              {album.release_date.substring(0, 4)} • {tracks.length} canciones
            </p>
            <Link to="/albums" className="back-to-albums-link">
              &larr; Volver a mis álbumes
            </Link>
          </div>
        </div>

        <ul className="track-list">
          {tracks.map((track) => (
            <li key={track.id} className="track-item">
              <div className="track-info">
                <span className="track-number">{track.track_number}.</span>
                <span className="track-name">{track.name}</span>
              </div>
              <div className="track-controls">
                <span className="track-duration">
                  {formatDuration(track.duration_ms)}
                </span>
                {track.preview_url && (
                  <button
                    onClick={() => playTrack(track.preview_url!)}
                    className="play-button"
                  >
                    &#9654;
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {currentTrack && (
          <div className="audio-player-container">
            <audio
              src={currentTrack}
              autoPlay
              controls
              onEnded={() => setCurrentTrack(null)}
            >
              Tu navegador no soporta el elemento de audio.
            </audio>
          </div>
        )}
      </main>
    </div>
  );
}
