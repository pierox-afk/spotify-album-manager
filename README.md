# Spoty App

Una aplicación web para buscar y gestionar álbumes de Spotify. Permite a los usuarios autenticarse con Spotify, buscar álbumes, guardarlos en su biblioteca y visualizarlos organizados por artista.

## Características

- 🔐 Autenticación con Spotify OAuth 2.0
- 🔍 Búsqueda de álbumes en tiempo real
- 💾 Guardado de álbumes favoritos
- 🎵 Creación e importación de mixes personalizados desde playlists de Spotify
- 🎵 Visualización de álbumes de canciones favoritas
- 🎵 Visualización de playlists personales
- 🎵 Visualización organizada por artista
- 🖱️ Interfaz de arrastrar y soltar para reordenar álbumes
- 📱 Diseño responsivo
- 🌙 Modo oscuro/claro

## Tecnologías Utilizadas

- **Frontend**: React 19 con TypeScript
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **API**: Spotify Web API
- **Autenticación**: OAuth 2.0 con PKCE
- **Styling**: CSS Modules
- **Linting**: ESLint

## Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Cuenta de desarrollador de Spotify

## Configuración

1. **Clona el repositorio**:

   ```bash
   git clone <url-del-repositorio>
   cd spoty-app
   ```

2. **Instala las dependencias**:

   ```bash
   npm install
   ```

3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto con:

   ```
   VITE_SPOTIFY_CLIENT_ID=tu_client_id_de_spotify
   VITE_REDIRECT_URI=https://spoty-app-aprz.vercel.app/callback
   ```

4. **Configura la aplicación en Spotify**:
   - Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Crea una nueva aplicación
   - Agrega la URI de redireccionamiento del archivo `.env` (por defecto: `https://spoty-app-aprz.vercel.app/callback`)
   - Copia el Client ID al archivo `.env`

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción
- `npm run lint` - Ejecuta ESLint

## Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Header.tsx      # Barra de navegación
│   ├── AlbumCard.tsx   # Tarjeta de álbum
│   ├── Pagination.tsx  # Componente de paginación
│   └── ...
├── pages/              # Páginas principales
│   ├── LoginPage.tsx           # Página de login
│   ├── SearchPage.tsx          # Página de búsqueda
│   ├── MyAlbums.tsx            # Página de álbumes guardados
│   ├── CustomAlbumDetailPage.tsx # Detalle de mix personalizado
│   └── AlbumPage.tsx           # Detalle de álbum
├── hooks/              # Hooks personalizados
│   ├── useAuth.ts      # Lógica de autenticación
│   └── useDebounce.ts  # Hook para debounce
├── lib/                # Utilidades
│   └── pkce.ts         # Funciones PKCE
├── types/              # Definiciones de tipos
│   └── customAlbum.ts  # Tipos para mixes personalizados
├── AuthContext.tsx     # Contexto de autenticación
├── spotifyClient.ts    # Cliente para API de Spotify
└── App.tsx             # Componente principal
```

## Funcionalidades Principales

### Autenticación

- Implementa OAuth 2.0 con flujo de autorización PKCE
- Manejo seguro de tokens de acceso
- Redireccionamiento automático al login cuando expira el token

### Búsqueda de Álbumes

- Búsqueda en tiempo real con debounce
- Paginación de resultados
- Indicadores de álbumes ya guardados

### Gestión de Álbumes

- Guardado y eliminación de álbumes
- Creación y gestión de mixes personalizados
- Importación de playlists de Spotify como mixes
- Organización por artista
- Reordenamiento mediante drag & drop
- Vista detallada de álbumes seleccionados

## API de Spotify

La aplicación utiliza los siguientes endpoints de la API de Spotify:

- `GET /search` - Búsqueda de álbumes
- `GET /me/albums` - Obtener álbumes guardados
- `PUT /me/albums` - Guardar álbum
- `DELETE /me/albums` - Eliminar álbum
- `GET /me/albums/contains` - Verificar si álbum está guardado
![WhatsApp Image 2025-11-07 at 20 05 00_e4eb4d8b](https://github.com/user-attachments/assets/f5dde567-de9c-4a91-b56d-4ec346b2ffca)
![WhatsApp Image 2025-11-07 at 20 05 18_6023b751](https://github.com/user-attachments/assets/38609a59-b4ef-4284-8437-6351cc010bf9)
![WhatsApp Image 2025-11-07 at 20 05 44_ccbf1018](https://github.com/user-attachments/assets/4737c04c-994e-4183-b54c-3a81358e4c1d)
![WhatsApp Image 2025-11-07 at 20 05 59_0a51e4f1](https://github.com/user-attachments/assets/6648770a-c565-4095-8cf7-8a0e88a10a8c)


## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.

---

## Vercel url

https://spoty-app-aprz.vercel.app

¡Disfruta explorando y guardando tus álbumes favoritos de Spotify!
