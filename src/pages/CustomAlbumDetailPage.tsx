import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import { MusicPlayer } from "../components/MusicPlayer";
import { CustomAlbumManager } from "../types/customAlbum";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import { useDebounce } from "../hooks/useDebounce";
import type { CustomAlbum, CustomTrack } from "../types/customAlbum";
import type { Track } from "../spotify";

import "../components/Page.css";
import "./CustomAlbumDetailPage.css";

export default function CustomAlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthContext();
  const [album, setAlbum] = useState<CustomAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CustomTrack | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (!id) return;

    const manager = CustomAlbumManager.getInstance();
    const foundAlbum = manager.getAlbumById(id);
    if (foundAlbum) {
      // Update album cover if needed
      if (token && foundAlbum.tracks.length > 0) {
        manager
          .updateAlbumCoverFromMostFrequentArtist(id, token)
          .then(() => {
            // Refresh album data after cover update
            const updatedAlbum = manager.getAlbumById(id);
            if (updatedAlbum) {
              setAlbum(updatedAlbum);
            }
          })
          .catch(console.error);
      }
      setAlbum(foundAlbum);
    } else {
      setError("Álbum no encontrado.");
    }
    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    const searchTracks = async () => {
      if (!debouncedQuery || !token) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const endpoint = `/search?q=${encodeURIComponent(
          debouncedQuery
        )}&type=track&limit=10`;
        const data = await spotifyFetch<{ tracks: { items: Track[] } }>(
          endpoint,
          token
        );
        if (data) {
          setSearchResults(data.tracks.items);
        }
      } catch (error) {
        console.error("Error searching tracks:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchTracks();
  }, [debouncedQuery, token]);

  const playTrack = (track: CustomTrack) => {
    setCurrentTrack(track);
  };

  const closePlayer = () => {
    setCurrentTrack(null);
  };

  const playNextTrack = () => {
    if (!album || !currentTrack) return;

    const currentIndex = album.tracks.findIndex(
      (t) => t.id === currentTrack.id
    );
    const nextIndex = (currentIndex + 1) % album.tracks.length;
    setCurrentTrack(album.tracks[nextIndex]);
  };

  const playPreviousTrack = () => {
    if (!album || !currentTrack) return;

    const currentIndex = album.tracks.findIndex(
      (t) => t.id === currentTrack.id
    );
    const prevIndex =
      currentIndex === 0 ? album.tracks.length - 1 : currentIndex - 1;
    setCurrentTrack(album.tracks[prevIndex]);
  };

  const addTrackToAlbum = async (track: Track) => {
    if (!album || !id) return;

    const manager = CustomAlbumManager.getInstance();
    const customTrack: CustomTrack = {
      id: track.id,
      name: track.name,
      artists: track.artists,
      duration_ms: track.duration_ms,
      track_number: album.tracks.length + 1,
      preview_url: undefined, // Spotify tracks don't have preview URLs in search results
      album: {
        images: album.coverUrl ? [{ url: album.coverUrl }] : [],
        name: album.name,
      },
    };

    manager.addTrackToAlbum(id, customTrack);

    // Remove track from search results
    setSearchResults((prev) => prev.filter((t) => t.id !== track.id));

    // Update album cover based on most frequent artist
    if (token) {
      await manager.updateAlbumCoverFromMostFrequentArtist(id, token);
    }

    // Force re-render by updating album state
    const updatedAlbum = manager.getAlbumById(id);
    if (updatedAlbum) {
      // Recalculate track numbers
      const updatedTracks = updatedAlbum.tracks.map((track, index) => ({
        ...track,
        track_number: index + 1,
      }));
      setAlbum({ ...updatedAlbum, tracks: updatedTracks });
    }
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
            src={album.coverUrl || "/default-album.png"}
            alt={album.name}
            className="album-details-image"
          />
          <div className="album-details-info">
            <h1>{album.name}</h1>
            <p>{album.description || "Álbum personalizado"}</p>
            <p>
              Creado: {new Date(album.createdAt).toLocaleDateString()} •{" "}
              {album.tracks.length} canciones
            </p>
            <Link to="/albums" className="back-to-albums-link">
              &larr; Volver a mis álbumes
            </Link>
          </div>
        </div>

        {/* Search and Add Tracks Section */}
        <div className="add-tracks-section">
          <h2>Agregar canciones</h2>
          <div className="search-container">
            <input
              id="search-input"
              name="search"
              type="text"
              placeholder="Buscar canciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {isSearching && <Spinner />}

          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Resultados de búsqueda</h3>
              <ul className="search-track-list">
                {searchResults.map((track) => (
                  <li key={track.id} className="search-track-item">
                    <div className="track-info">
                      <span className="track-name">{track.name}</span>
                      <span className="track-artist">
                        {track.artists.map((artist) => artist.name).join(", ")}
                      </span>
                    </div>
                    <button
                      onClick={() => addTrackToAlbum(track)}
                      className="add-track-btn"
                      disabled={album?.tracks.some((t) => t.id === track.id)}
                    >
                      {album?.tracks.some((t) => t.id === track.id)
                        ? "✓ Agregada"
                        : "+ Agregar"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <ul className="track-list">
          {album.tracks.map((track) => (
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
                  onClick={() => playTrack(track)}
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

        {currentTrack && (
          <MusicPlayer
            currentTrack={currentTrack}
            onClose={closePlayer}
            onNext={playNextTrack}
            onPrevious={playPreviousTrack}
          />
        )}
      </main>
    </div>
  );
}
