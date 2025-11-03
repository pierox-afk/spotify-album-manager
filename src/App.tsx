import { type JSX } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SearchPage from "./pages/SearchPage";
import MyAlbums from "./pages/MyAlbums";
import AlbumTracksPage from "./pages/AlbumTracksPage";
import CustomAlbumDetailPage from "./pages/CustomAlbumDetailPage";
import { useAuthContext } from "./hooks/useAuthContext";
import { ModalProvider } from "./ModalContext";
import CallbackPage from "./pages/CallbackPage";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuthContext();
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ModalProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/albums"
          element={
            <ProtectedRoute>
              <MyAlbums />
            </ProtectedRoute>
          }
        />
        <Route
          path="/album/:id"
          element={
            <ProtectedRoute>
              <AlbumTracksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/custom-album/:id"
          element={
            <ProtectedRoute>
              <CustomAlbumDetailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ModalProvider>
  );
}

export default App;
