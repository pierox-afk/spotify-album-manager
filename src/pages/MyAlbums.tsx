import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import { Header } from "../components/Header";
import { useModal } from "../hooks/useModal";
import type { Album } from "../spotify";
import { CustomAlbumManager } from "../types/customAlbum";
import type { CustomAlbum } from "../types/customAlbum";

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
}

import "../components/Page.css";
import "./MyAlbumsPage.css";

export default function MyAlbums() {
  const { token, logout } = useAuthContext();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [customAlbums, setCustomAlbums] = useState<CustomAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [draggedAlbum, setDraggedAlbum] = useState<Album | null>(null);
  const [showCreateMixModal, setShowCreateMixModal] = useState(false);
  const [mixTitle, setMixTitle] = useState("");
  const [nextUrl, setNextUrl] = useState<string | null>("/me/albums?limit=20");
  const [likedAlbums, setLikedAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fetchSavedAlbums = useCallback(async () => {
    if (!token || !nextUrl) return;

    try {
      setIsLoading(true);
      const data = await spotifyFetch<{
        items: { album: Album }[];
        next: string | null;
      }>(nextUrl, token, {}, () =>
        showModal(
          "Acceso Denegado",
          "Tu email no está autorizado para usar esta aplicación."
        )
      );
      if (data) {
        const savedAlbums = data.items.map((item) => item.album);
        setAlbums((prev) => [...prev, ...savedAlbums]);
        setNextUrl(data.next);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, nextUrl, showModal, logout]);

  useEffect(() => {
    if (nextUrl) {
      fetchSavedAlbums();
    }
  }, [nextUrl, fetchSavedAlbums]);

  useEffect(() => {
    const manager = CustomAlbumManager.getInstance();
    setCustomAlbums(manager.getAlbums());
  }, []);

  useEffect(() => {
    const fetchLikedAlbums = async () => {
      if (!token) return;
      try {
        const data = await spotifyFetch<{
          items: { track: { album: Album } }[];
        }>("/me/tracks?limit=50", token, {});
        if (data) {
          const albums = data.items.map((item) => item.track.album);
          const uniqueAlbums = albums.filter(
            (album, index, self) =>
              self.findIndex((a) => a.id === album.id) === index
          );
          setLikedAlbums(uniqueAlbums);
        }
      } catch (error) {
        console.error("Error fetching liked albums:", error);
      }
    };
    fetchLikedAlbums();
  }, [token]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!token) return;
      try {
        const data = await spotifyFetch<{
          items: {
            id: string;
            name: string;
            images: { url: string }[];
            tracks: { total: number };
          }[];
        }>("/me/playlists?limit=50", token, {});
        if (data) {
          setPlaylists(data.items);
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };
    fetchPlaylists();
  }, [token]);

  const groupByArtist = (albums: Album[]) => {
    const grouped: { [key: string]: Album[] } = {};
    albums.forEach((album) => {
      const artistName = album.artists[0]?.name || "Unknown";
      if (!grouped[artistName]) {
        grouped[artistName] = [];
      }
      grouped[artistName].push(album);
    });
    return grouped;
  };

  const handleRemoveAlbum = async (albumId: string) => {
    if (!token) return;

    // Check if the album is in saved albums
    const isSaved = albums.some((album) => album.id === albumId);
    if (!isSaved) {
      showModal(
        "No se puede eliminar",
        "Este álbum no está en tus álbumes guardados."
      );
      return;
    }

    try {
      await spotifyFetch(
        `/me/albums?ids=${albumId}`,
        token,
        {
          method: "DELETE",
        },
        () =>
          showModal(
            "Acceso Denegado",
            "Tu email no está autorizado para usar esta aplicación."
          )
      );
      const newAlbums = albums.filter((album) => album.id !== albumId);
      setAlbums(newAlbums);

      if (selectedAlbum?.id === albumId) {
        const newCombined = [...newAlbums, ...likedAlbums].filter(
          (album, index, self) =>
            self.findIndex((a) => a.id === album.id) === index
        );
        if (newCombined.length > 0) {
          const currentIndex = combinedAlbums.findIndex(
            (a) => a.id === albumId
          );
          const nextIndex = Math.min(currentIndex, newCombined.length - 1);
          setSelectedAlbum(newCombined[nextIndex]);
        } else {
          setSelectedAlbum(null);
        }
      }
    } catch {
      setError("Error removing album");
    }
  };

  const handleRemoveCustomAlbum = (albumId: string) => {
    const manager = CustomAlbumManager.getInstance();
    manager.deleteAlbum(albumId);
    setCustomAlbums(manager.getAlbums());

    if (selectedAlbum?.id === albumId) {
      setSelectedAlbum(null);
    }
  };

  const handleDragStart = (album: Album) => {
    setDraggedAlbum(album);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetAlbum: Album) => {
    e.preventDefault();
    if (!draggedAlbum || draggedAlbum.id === targetAlbum.id) return;

    const draggedArtist = draggedAlbum.artists[0]?.name || "Unknown";
    const targetArtist = targetAlbum.artists[0]?.name || "Unknown";

    if (draggedArtist !== targetArtist) return;

    const newAlbums = [...albums];
    const draggedIndex = newAlbums.findIndex((a) => a.id === draggedAlbum.id);
    const targetIndex = newAlbums.findIndex((a) => a.id === targetAlbum.id);

    newAlbums.splice(draggedIndex, 1);
    newAlbums.splice(targetIndex, 0, draggedAlbum);

    setAlbums(newAlbums);
    setDraggedAlbum(null);
  };

  const sliderSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sliderSectionRef.current &&
        !sliderSectionRef.current.contains(event.target as Node)
      ) {
        setSelectedAlbum(null);
      }
    };

    if (selectedAlbum) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedAlbum]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider) return;

    isDown.current = true;
    slider.classList.add("active-drag");
    startX.current = e.pageX - slider.offsetLeft;
    scrollLeft.current = slider.scrollLeft;
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!selectedAlbum?.id || !slider) return;

    const onMouseUp = () => {
      isDown.current = false;
      if (slider) {
        slider.classList.remove("active-drag");
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown.current || !slider) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX.current) * 2;
      slider.scrollLeft = scrollLeft.current - walk;
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [selectedAlbum?.id]);

  useEffect(() => {
    if (selectedAlbum?.id) {
      const selectedAlbumElement = document.getElementById(selectedAlbum.id);
      selectedAlbumElement?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
      });
    }
  }, [selectedAlbum?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && nextUrl && !isLoading) {
          fetchSavedAlbums();
        }
      },
      { threshold: 1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [nextUrl, isLoading, fetchSavedAlbums]);

  if (error) return <Message type="error" text={`Error: ${error}`} />;

  const combinedAlbums = [...albums, ...likedAlbums].filter(
    (album, index, self) => self.findIndex((a) => a.id === album.id) === index
  );

  const groupedAlbums = groupByArtist(combinedAlbums);

  const sortedArtists = Object.keys(groupedAlbums).sort((a, b) => {
    return groupedAlbums[b].length - groupedAlbums[a].length;
  });
  const sortedGroupedAlbums: { [key: string]: Album[] } = {};
  sortedArtists.forEach((artist) => {
    sortedGroupedAlbums[artist] = groupedAlbums[artist];
  });

  const createMix = async (title: string) => {
    try {
      const manager = CustomAlbumManager.getInstance();
      const album = manager.createAlbum(title);
      setCustomAlbums(manager.getAlbums());
      setShowCreateMixModal(false);
      setMixTitle("");
      navigate(`/custom-album/${album.id}`);
    } catch (error) {
      console.error("Error creating album:", error);
      showModal("Error", "No se pudo crear el álbum. Inténtalo de nuevo.");
    }
  };

  const handleCreateMix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mixTitle.trim()) return;
    createMix(mixTitle.trim());
  };

  return (
    <div className="page-container">
      <Header />
      <main>
        <section className="albums-header">
          <div className="header-content">
            <div>
              <h1>
                Mis <span className="highlight">álbumes</span> guardados
              </h1>
              <p>
                Disfruta de tu música a un solo click y descubre qué discos has
                guardado dentro de 'mis álbumes'.
              </p>
            </div>
            <button
              className="create-mix-btn"
              onClick={() => setShowCreateMixModal(true)}
            >
              🎵 Crear Mix
            </button>
          </div>
        </section>

        {selectedAlbum ? (
          <section className="selected-album-section" ref={sliderSectionRef}>
            <div className="selected-header">
              <button
                className="view-btn back-btn"
                onClick={() => setSelectedAlbum(null)}
              >
                &larr; Volver a la lista
              </button>
            </div>
            <div
              className="selected-album-slider"
              ref={sliderRef}
              onMouseDown={onMouseDown}
            >
              {combinedAlbums.map((album) => (
                <div
                  key={album.id}
                  id={album.id}
                  className={`selected-slider-item ${
                    album.id === selectedAlbum.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedAlbum(album)}
                >
                  <img
                    src={album.images[0]?.url || ""}
                    alt={album.name}
                    className="selected-slider-image"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                  {album.id === selectedAlbum.id && (
                    <div className="selected-slider-info">
                      <div className="info-left">
                        <h4>{album.name}</h4>
                        <p>Publicado: {album.release_date}</p>
                      </div>
                      {album.id === selectedAlbum.id && (
                        <div className="selected-buttons">
                          <button
                            className="view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/album/${album.id}`);
                            }}
                          >
                            Ver canciones
                          </button>
                          <button
                            className="remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAlbum(album.id);
                            }}
                          >
                            - Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="albums-section">
            {customAlbums.length > 0 && (
              <div className="artist-group">
                <h2>Tus mixes</h2>
                <div className="albums-grid">
                  {customAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="album-card"
                      onClick={() => navigate(`/custom-album/${album.id}`)}
                    >
                      <img
                        src={album.coverUrl || "/default-album.png"}
                        alt={album.name}
                        className="album-image"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                      <div className="album-content">
                        <div className="album-info">
                          <h3>{album.name}</h3>
                          <p>{album.tracks.length} canciones</p>
                        </div>
                        <div className="album-buttons">
                          <button
                            className="view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/custom-album/${album.id}`);
                            }}
                          >
                            Ver canciones
                          </button>
                          <button
                            className="remove-album-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomAlbum(album.id);
                            }}
                          >
                            - Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {likedAlbums.length > 0 && (
              <div className="artist-group">
                <h2>Álbumes de tus canciones favoritas</h2>
                <div className="albums-grid">
                  {likedAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="album-card"
                      onClick={() => setSelectedAlbum(album)}
                    >
                      <img
                        src={album.images[1]?.url || album.images[0]?.url || ""}
                        alt={album.name}
                        className="album-image"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                      <div className="album-content">
                        <div className="album-info">
                          <h3>{album.name}</h3>
                          <p>Publicado: {album.release_date}</p>
                        </div>
                        <div className="album-buttons">
                          <button
                            className="view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/album/${album.id}`);
                            }}
                          >
                            Ver canciones
                          </button>
                          <button
                            className="remove-album-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAlbum(album.id);
                            }}
                          >
                            - Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playlists.length > 0 && (
              <div className="artist-group">
                <h2>Mis playlists</h2>
                <div className="albums-grid">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="album-card">
                      <img
                        src={playlist.images[0]?.url || "/default-album.png"}
                        alt={playlist.name}
                        className="album-image"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                      <div className="album-content">
                        <div className="album-info">
                          <h3>{playlist.name}</h3>
                          <p>{playlist.tracks.total} canciones</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(sortedGroupedAlbums).map(
              ([artist, artistAlbums]) => (
                <div key={artist} className="artist-group">
                  <h2>{artist}</h2>
                  <div className="albums-grid">
                    {artistAlbums.map((album) => (
                      <div
                        key={album.id}
                        className="album-card"
                        draggable
                        onDragStart={() => handleDragStart(album)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, album)}
                        onClick={() => setSelectedAlbum(album)}
                      >
                        <img
                          src={
                            album.images[1]?.url || album.images[0]?.url || ""
                          }
                          alt={album.name}
                          className="album-image"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity =
                              "0.3";
                          }}
                        />
                        <div className="album-content">
                          <div className="album-info">
                            <h3>{album.name}</h3>
                            <p>Publicado: {album.release_date}</p>
                          </div>
                          <div className="album-buttons">
                            <button
                              className="view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/album/${album.id}`);
                              }}
                            >
                              Ver canciones
                            </button>
                            <button
                              className="remove-album-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAlbum(album.id);
                              }}
                            >
                              - Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </section>
        )}
        {isLoading && <Spinner />}
        {!isLoading && nextUrl && <div ref={loaderRef} />}

        {showCreateMixModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowCreateMixModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Crear Nuevo Mix</h2>
              <form onSubmit={handleCreateMix}>
                <div className="form-group">
                  <label htmlFor="mix-title">Título del Mix *</label>
                  <input
                    id="mix-title"
                    type="text"
                    value={mixTitle}
                    onChange={(e) => setMixTitle(e.target.value)}
                    placeholder="Mi Mix Favorito"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowCreateMixModal(false);
                      setMixTitle("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="create-btn">
                    Crear Mix
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
