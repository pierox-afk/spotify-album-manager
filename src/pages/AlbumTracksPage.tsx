import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import type { Track, AlbumTracks, Album } from "../spotify";
import { useModal } from "../hooks/useModal";
import { Header } from "../components/Header";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import { MusicPlayer } from "../components/MusicPlayer";
import "../components/Page.css";
import "./AlbumTracksPage.css";

export default function AlbumTracksPage() {
  const { id } = useParams<{ id: string }>();
  const { token, logout } = useAuthContext();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);

  useEffect(() => {
    const fetchAlbumAndTracks = async () => {
      if (!id || !token) return;

      setIsLoading(true);
      setError(null);

      try {
        const albumData = await spotifyFetch<Album>(
          `/albums/${id}`,
          token,
          {},
          () =>
            showModal(
              "Acceso Denegado",
              "Tu email no está autorizado para usar esta aplicación."
            )
        );
        setAlbum(albumData);

        const tracksData = await spotifyFetch<AlbumTracks>(
          `/albums/${id}/tracks`,
          token,
          {},
          () =>
            showModal(
              "Acceso Denegado",
              "Tu email no está autorizado para usar esta aplicación."
            )
        );
        if (tracksData) {
          console.log("Tracks data:", tracksData.items[0]); // Debug first track
          setTracks(tracksData.items);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbumAndTracks();
  }, [id, token, logout, showModal]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const playTrack = (track: Track, index: number) => {
    console.log(
      "Playing track:",
      track.name,
      "Preview URL:",
      track.preview_url
    );
    const trackWithAlbum = { ...track, album };
    setCurrentTrack(trackWithAlbum);
    setCurrentTrackIndex(index);
  };

  const playNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      const nextTrack = { ...tracks[nextIndex], album };
      setCurrentTrack(nextTrack);
      setCurrentTrackIndex(nextIndex);
    }
  };

  const playPrevious = () => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      const prevTrack = { ...tracks[prevIndex], album };
      setCurrentTrack(prevTrack);
      setCurrentTrackIndex(prevIndex);
    }
  };

  const closePlayer = () => {
    setCurrentTrack(null);
    setCurrentTrackIndex(-1);
  };

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (error) return <Message type="error" text={`Error: ${error}`} />;
    if (!album) return <Message text="Álbum no encontrado." />;

    return (
      <div className="album-tracks-container">
        <div className="album-header">
          <img
            src={
              album.images[0]?.url ||
              "https://via.placeholder.com/300?text=No+Image"
            }
            alt={album.name}
            className="album-cover"
          />
          <div className="album-info">
            <h1>{album.name}</h1>
            <p>Por {album.artists.map((artist) => artist.name).join(", ")}</p>
            <p>Publicado: {album.release_date}</p>
          </div>
        </div>
        <ul className="track-list">
          {tracks.map((track, index) => (
            <li key={track.id} className="track-item">
              <div className="track-info">
                <span className="track-number">{track.track_number}.</span>
                <span className="track-name">{track.name}</span>
                <span className="track-artist">
                  {track.artists.map((artist) => artist.name).join(", ")}
                </span>
              </div>
              <div className="track-controls">
                <span className="track-duration">
                  {formatDuration(track.duration_ms)}
                </span>
                <button
                  onClick={() => playTrack(track, index)}
                  className="play-button"
                >
                  {currentTrack?.id === track.id ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="page-container">
      <Header />
      <main>
        <section className="album-tracks-section">
          <button onClick={() => navigate(-1)} className="back-button">
            ← Volver
          </button>
          {renderContent()}
        </section>
      </main>
      <MusicPlayer
        currentTrack={currentTrack}
        onClose={closePlayer}
        onNext={currentTrackIndex < tracks.length - 1 ? playNext : undefined}
        onPrevious={currentTrackIndex > 0 ? playPrevious : undefined}
      />
    </div>
  );
}
