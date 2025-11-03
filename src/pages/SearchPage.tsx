import { useState, useEffect } from "react";
import { useAuthContext } from "../hooks/useAuthContext";
import { spotifyFetch } from "../spotifyClient";
import type { Album, SearchResponse } from "../spotify";
import { useDebounce } from "../hooks/useDebounce";
import { useModal } from "../hooks/useModal";

import "../components/Page.css";
import Pagination from "../components/Pagination";
import "../components/Pagination.css";
import { AlbumGrid } from "../components/AlbumGrid";
import { Spinner } from "../components/Spinner";
import { Message } from "../components/Message";
import { Header } from "../components/Header";
import "../components/SearchInput.css";

export default function SearchPage() {
  const { token, logout } = useAuthContext();
  const { showModal } = useModal();
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedAlbumIds, setSavedAlbumIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const searchAlbums = async () => {
      if (!debouncedQuery || !token) {
        setAlbums([]);
        setNoResults(false);
        setTotalPages(1);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNoResults(false);

      try {
        const limit = 4;
        const offset = (currentPage - 1) * limit;
        const endpoint = `/search?q=${encodeURIComponent(
          debouncedQuery
        )}&type=album&limit=${limit}&offset=${offset}`;
        const data = await spotifyFetch<SearchResponse>(
          endpoint,
          token,
          {},
          () =>
            showModal(
              "Acceso Denegado",
              "Tu email no está autorizado para usar esta aplicación."
            )
        );

        if (data) {
          const albumIds = data.albums.items.map((album) => album.id);
          if (albumIds.length > 0) {
            const checkSavedEndpoint = `/me/albums/contains?ids=${albumIds.join(
              ","
            )}`;
            const savedStatus = await spotifyFetch<boolean[]>(
              checkSavedEndpoint,
              token,
              {},
              () =>
                showModal(
                  "Acceso Denegado",
                  "Tu email no está autorizado para usar esta aplicación."
                )
            );
            if (savedStatus) {
              const newSavedAlbumIds = new Set(savedAlbumIds);
              let added = false;
              savedStatus.forEach((isSaved, index) => {
                if (isSaved && !newSavedAlbumIds.has(albumIds[index])) {
                  newSavedAlbumIds.add(albumIds[index]);
                  added = true;
                }
              });
              if (added) setSavedAlbumIds(newSavedAlbumIds);
            }
          }

          if (data.albums.items.length === 0) {
            setNoResults(true);
            setAlbums([]);
            setTotalPages(1);
          } else {
            setAlbums(data.albums.items);
            setTotalPages(Math.ceil(data.albums.total / limit));
          }
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

    searchAlbums();
  }, [debouncedQuery, token, logout, currentPage, savedAlbumIds, showModal]);

  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (error) return <Message type="error" text={`Error: ${error}`} />;
    if (noResults)
      return <Message text="No se encontraron resultados para tu búsqueda." />;
    if (albums.length > 0)
      return (
        <AlbumGrid
          albums={albums}
          savedAlbumIds={savedAlbumIds}
          onToggleSave={setSavedAlbumIds}
        />
      );
    if (!debouncedQuery) return <Message text="" />;
    return null;
  };

  return (
    <div className="page-container">
      <Header />
      <main>
        <section className="search-section">
          <div className="search-header">
            <h1>
              Busca tus <span className="highlight">álbumes</span>
            </h1>
            {query.length === 0 && (
              <p>
                Encuentra tus artistas favoritos gracias a nuestro buscador y
                guarda tus álbumes favoritos.
              </p>
            )}
          </div>
          <form className="search-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Buscar álbumes, artistas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </form>
        </section>
        <section className="results-section">
          {debouncedQuery && !noResults && albums.length > 0 && (
            <h2>
              Guarda tus álbumes favoritos de{" "}
              <span className="highlight">{albums[0].artists[0].name}</span>
            </h2>
          )}
          {renderContent()}
        </section>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </div>
  );
}
