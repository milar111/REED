'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FileSystemDirectoryHandle {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  name: string;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

interface Image {
  url: string;
  height: number | null;
  width: number | null;
}

interface Owner {
  id: string;
  display_name: string;
}

interface Tracks {
  total: number;
}

interface Playlist {
  id: string;
  name: string;
  images: Image[];
  owner: Owner;
  tracks: Tracks;
}

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPlaylists, setDownloadingPlaylists] = useState<Set<string>>(new Set());

  const handleDownload = async (playlistId: string) => {
    let selectedDirHandle: FileSystemDirectoryHandle;
    try {
      setDownloadingPlaylists((prev) => new Set(prev).add(playlistId));

      // show dir picker
      selectedDirHandle = await window.showDirectoryPicker();

      //playlist name
      const playlistName = playlists.find((p) => p.id === playlistId)?.name || playlistId;
      const fileHandle = await selectedDirHandle.getFileHandle(`${playlistName}.zip`, { create: true });

      const formData = new FormData();
      formData.append('download_dir', selectedDirHandle.name);
      formData.append('playlist_name', playlistName);

      //download on the server
      const response = await fetch(`http://localhost:8000/download/${playlistId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Download failed to start on the server');
      }

      // 2sec
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `http://localhost:8000/download-status/${playlistId}`,
            { credentials: 'include' }
          );
          if (!statusResponse.ok) {
            throw new Error('Failed to check download status');
          }
          const status = await statusResponse.json();
          if (status.completed) {
            clearInterval(pollInterval);
            if (status.error) {
              alert(`Download failed: ${status.error}`);
            } else {
              const archiveResponse = await fetch(
                `http://localhost:8000/download-archive/${playlistId}`,
                { credentials: 'include' }
              );
              if (!archiveResponse.ok) {
                throw new Error('Failed to fetch the archive');
              }
              const blob = await archiveResponse.blob();

              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();

              alert('Download complete and saved to your selected folder.');
            }
            setDownloadingPlaylists((prev) => {
              const newSet = new Set(prev);
              newSet.delete(playlistId);
              return newSet;
            });
          }
        } catch (error) {
          console.error('Status check failed:', error);
          clearInterval(pollInterval);
          setDownloadingPlaylists((prev) => {
            const newSet = new Set(prev);
            newSet.delete(playlistId);
            return newSet;
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to start download. Please try again.');
      setDownloadingPlaylists((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const authResponse = await fetch('http://localhost:8000/check_auth', {
          credentials: 'include',
        });
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          window.location.href = '/login';
          return;
        }
        
        const playlistsResponse = await fetch('http://localhost:8000/api/playlists', {
          credentials: 'include',
        });
        
        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 401) {
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to load playlists');
        }
        
        const data = await playlistsResponse.json();
        setPlaylists(data.playlists);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPlaylists();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 animate-pulse">Loading your playlists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-rose-400 mb-4">{error}</div>
        <Link 
          href="/"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-slate-100 cursor-default">REED</span>
          </div>
          <form action="http://localhost:8000/logout" method="get">
            <button
              type="submit"
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Logout
            </button>
          </form>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Your Playlists</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="bg-slate-800 rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-emerald-400/10 hover:scale-[1.02]"
            >
              <div className="h-48 bg-slate-700 relative">
                {playlist.images && playlist.images[0] ? (
                  <img 
                    src={playlist.images[0].url} 
                    alt={`${playlist.name} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-700">
                    <svg className="w-16 h-16 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold text-white truncate">{playlist.name}</h3>
                <p className="text-slate-400 mt-2 mb-4">
                  {playlist.tracks.total} tracks • By {playlist.owner.display_name}
                </p>
                
                <button 
                  onClick={() => handleDownload(playlist.id)}
                  disabled={downloadingPlaylists.has(playlist.id)}
                  className={`inline-block rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors
                    ${downloadingPlaylists.has(playlist.id) 
                      ? 'bg-emerald-700 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {downloadingPlaylists.has(playlist.id) ? 'Downloading...' : 'Download Playlist'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {playlists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">You don't have any playlists yet.</p>
          </div>
        )}
      </section>
      
      <footer className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-500">
            This project is not affiliated with Spotify AB. All music rights belong to their respective owners.
            <br />Purely educational demonstration of API integration concepts.
          </p>
        </div>
      </footer>
    </main>
  );
}