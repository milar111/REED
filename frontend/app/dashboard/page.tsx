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
      // const response = await fetch(`http://localhost:8000/download/${playlistId}`, {
      const response = await fetch(`https://reed-gilt.vercel.app/download/${playlistId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Download failed to start on the server');
      }

      //2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            // `http://localhost:8000/download-status/${playlistId}`,
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
                // `http://localhost:8000/download-archive/${playlistId}`,
                `https://reed-gilt.vercel.app/download-archive/${playlistId}`,
                { credentials: 'include' }
              );
              if (!archiveResponse.ok) {
                throw new Error('Failed to fetch the archive');
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
    } finally {
      setSelectedPlaylistForDownload(null);
      setSelectedDirHandle(null);
    }
  };

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const authResponse = await fetch('https://reed-gilt.vercel.app/check_auth', {
          credentials: 'include',
        });
        
        if (!authResponse.ok) {
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }

        const playlistsResponse = await fetch('https://reed-gilt.vercel.app/api/playlists', {
          credentials: 'include',
        });
        
        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 401) {
            const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
            window.location.href = `${basePath}/login`;
            return;
          }
          throw new Error('Failed to load playlists');
        }
        
        const data = await playlistsResponse.json();
        setPlaylists(data.playlists);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
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
