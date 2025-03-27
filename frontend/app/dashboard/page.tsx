'use client';

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PlaylistCard from '../components/PlaylistCard';
import DownloadModal from '../components/DownloadModal';
import { Playlist } from '../types';

export {};

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPlaylists, setDownloadingPlaylists] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForDownload, setSelectedPlaylistForDownload] = useState<string | null>(null);
  const [selectedDirHandle, setSelectedDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveFormat, setSaveFormat] = useState<'zip' | 'folder'>('zip');

  const openDownloadModal = (playlistId: string) => {
    setSelectedPlaylistForDownload(playlistId);
    setModalOpen(true);
  };

  //select dir
  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setSelectedDirHandle(dirHandle);
    } catch (e) {
      console.error('Folder selection cancelled or failed:', e);
    }
  };

  // download process when the user confirms
  const startDownload = async () => {
    if (!selectedPlaylistForDownload || !selectedDirHandle) {
      alert('Please select a folder to save your music.');
      return;
    }
    const playlistId = selectedPlaylistForDownload;
    setModalOpen(false);
    setDownloadingPlaylists((prev) => new Set(prev).add(playlistId));

    const playlistName = playlists.find((p) => p.id === playlistId)?.name || playlistId;
    let fileName = saveFormat === 'zip' ? `${playlistName}.zip` : playlistName;

    try {
      let targetHandle: FileSystemFileHandle | FileSystemDirectoryHandle;
      if (saveFormat === 'zip') {
        targetHandle = await selectedDirHandle.getFileHandle(fileName, { create: true });
      } else {
        if (!selectedDirHandle.getDirectoryHandle) {
          throw new Error("Directory creation is not supported in this browser.");
        }
        targetHandle = await selectedDirHandle.getDirectoryHandle(fileName, { create: true });
      }

      const formData = new FormData();
      formData.append('download_dir', selectedDirHandle.name);
      formData.append('playlist_name', playlistName);
      formData.append('format', saveFormat);

      // download on the server
      const response = await fetch(`https://reed-gilt.vercel.app/download/${playlistId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed to start on the server');
      }

      let attempts = 0;
      const maxAttempts = 90; // 3 minutes with 2-second intervals
      
      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          const statusResponse = await fetch(
            `https://reed-gilt.vercel.app/download-status/${playlistId}`,
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
                `https://reed-gilt.vercel.app/download-archive/${playlistId}`,
                { credentials: 'include' }
              );
              
              if (!archiveResponse.ok) {
                const errorData = await archiveResponse.json();
                throw new Error(errorData.error || 'Failed to fetch the archive');
              }
              
              const blob = await archiveResponse.blob();
              
              if (saveFormat === 'zip') {
                const writable = await (targetHandle as FileSystemFileHandle).createWritable();
                await writable.write(blob);
                await writable.close();
              } else {
                // normal folder format
                const jszip = new JSZip();
                const zipContent = await jszip.loadAsync(blob);
                for (const [relativePath, zipEntryRaw] of Object.entries(zipContent.files)) {
                  const zipEntry = zipEntryRaw as JSZip.JSZipObject;
                  if (!zipEntry.dir) {
                    const fileData = await zipEntry.async('blob');
                    const pathParts = relativePath.split('/').filter(Boolean);
                    if (pathParts.length === 0) continue;
                    let currentDir = targetHandle as FileSystemDirectoryHandle;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                      if (!currentDir.getDirectoryHandle) {
                        throw new Error("Directory creation is not supported in this browser.");
                      }
                      currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
                    }
                    const fileHandle = await currentDir.getFileHandle(pathParts[pathParts.length - 1], { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(fileData);
                    await writable.close();
                  }
                }
              }
              alert('Download complete and saved to your selected folder.');
            }
            setDownloadingPlaylists((prev) => {
              const newSet = new Set(prev);
              newSet.delete(playlistId);
              return newSet;
            });
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            alert('Download timed out. Please try again.');
            setDownloadingPlaylists((prev) => {
              const newSet = new Set(prev);
              newSet.delete(playlistId);
              return newSet;
            });
          }
        } catch (error) {
          console.error('Status check failed:', error);
          clearInterval(pollInterval);
          alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setDownloadingPlaylists((prev) => {
            const newSet = new Set(prev);
            newSet.delete(playlistId);
            return newSet;
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to start download: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDownloadingPlaylists((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    } finally {
      setSelectedPlaylistForDownload(null);
      setSelectedDirHandle(null);
    }
  };

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        console.log('Checking authentication status...');
        
        // Check for token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
          console.log('Token found in URL, using it directly');
          // Use the token to fetch playlists directly from Spotify API
          
          const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!playlistsResponse.ok) {
            console.error('Failed to fetch playlists with token from URL:', playlistsResponse.status);
            throw new Error('Failed to fetch playlists');
          }
          
          const data = await playlistsResponse.json();
          console.log('Playlists fetched directly from Spotify API');
          setPlaylists(data.items);
          
          // Clear token from URL for security
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsLoading(false);
          return;
        }
        
        // Fallback to normal authentication check
        console.log('No token in URL, checking session auth');
        const authResponse = await fetch('https://reed-gilt.vercel.app/check_auth', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log('Auth response status:', authResponse.status);
        console.log('Auth response headers:', Object.fromEntries([...authResponse.headers]));
        
        if (!authResponse.ok) {
          console.error('Auth check failed with status:', authResponse.status);
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }
        
        const authData = await authResponse.json();
        console.log('Auth data received:', authData);
        
        if (!authData.authenticated) {
          console.error('Not authenticated according to response data');
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }

        console.log('Authentication successful, fetching playlists...');
        const playlistsResponse = await fetch('https://reed-gilt.vercel.app/api/playlists', {
          credentials: 'include',
        });
        
        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 401) {
            console.error('Playlists fetch returned 401 unauthorized');
            const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
            window.location.href = `${basePath}/login`;
            return;
          }
          throw new Error('Failed to load playlists');
        }
        
        const data = await playlistsResponse.json();
        console.log('Playlists received:', data);
        setPlaylists(data.playlists);
      } catch (err) {
        console.error('Error in fetchPlaylists:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    // Check for cookies first
    const cookies = document.cookie;
    console.log('Current cookies:', cookies);
    
    fetchPlaylists();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-emerald-400 animate-pulse text-lg">Loading your playlists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <div className="text-rose-400 mb-4 text-center">{error}</div>
        <a
          href="/"
          className="px-4 py-2 bg-emerald-600/80 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Return Home
        </a>
      </div>
    );
  }

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistForDownload);

  return (
    <main className="min-h-screen bg-slate-900">
      <Header />
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-[320px] sm:max-w-md md:max-w-none mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Your Playlists</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard 
                key={playlist.id}
                playlist={playlist}
                isDownloading={downloadingPlaylists.has(playlist.id)}
                onDownload={openDownloadModal}
              />
            ))}
          </div>
        </div>
      </section>
      <Footer />
      <DownloadModal
        isOpen={modalOpen}
        playlist={currentPlaylist}
        selectedDirHandle={selectedDirHandle}
        saveFormat={saveFormat}
        onClose={() => setModalOpen(false)}
        onSelectFolder={handleSelectFolder}
        onConfirm={startDownload}
        onChangeFormat={setSaveFormat}
      />
    </main>
  );
}
