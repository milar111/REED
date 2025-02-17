import { Playlist } from '../types';

interface DownloadModalProps {
  isOpen: boolean;
  playlist: Playlist | undefined;
  selectedDirHandle: FileSystemDirectoryHandle | null;
  saveFormat: 'zip' | 'folder';
  onClose: () => void;
  onSelectFolder: () => void;
  onConfirm: () => void;
  onChangeFormat: (format: 'zip' | 'folder') => void;
}

export default function DownloadModal({
  isOpen,
  playlist,
  selectedDirHandle,
  saveFormat,
  onClose,
  onSelectFolder,
  onConfirm,
  onChangeFormat,
}: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-80">
        <h3 className="text-lg text-emerald-400 mb-2">
          {playlist?.name || 'Playlist'}
        </h3>
        <h2 className="text-xl text-white mb-4">Save Playlist</h2>
        
        <div className="mb-4">
          <button
            onClick={onSelectFolder}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
          >
            {selectedDirHandle ? 'Change Folder' : 'Select Folder'}
          </button>
          {selectedDirHandle && (
            <p className="text-slate-300 text-sm mt-2">Folder: {selectedDirHandle.name}</p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-white mb-2">Save format:</p>
          <label className="text-slate-300 mr-4">
            <input 
              type="radio" 
              name="format" 
              value="zip" 
              checked={saveFormat === 'zip'} 
              onChange={() => onChangeFormat('zip')}
              className="mr-1"
            />
            Zip
          </label>
          <label className="text-slate-300">
            <input 
              type="radio" 
              name="format" 
              value="folder" 
              checked={saveFormat === 'folder'} 
              onChange={() => onChangeFormat('folder')}
              className="mr-1"
            />
            Normal Folder
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
