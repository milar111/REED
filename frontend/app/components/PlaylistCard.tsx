import { Playlist } from "../types";

interface PlaylistCardProps {
  playlist: Playlist;
  isDownloading: boolean;
  onDownload: (playlistId: string) => void;
}

export default function PlaylistCard({ playlist, isDownloading, onDownload }: PlaylistCardProps) {
  return (
    <div 
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
          onClick={() => onDownload(playlist.id)}
          disabled={isDownloading}
          className={`inline-block rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors
            ${isDownloading ? 'bg-emerald-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {isDownloading ? 'Downloading...' : 'Download Playlist'}
        </button>
      </div>
    </div>
  );
}
