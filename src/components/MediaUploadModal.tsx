import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Film, AlertCircle, Sparkles } from 'lucide-react';
import { extractVideoFirstFrame, readFileAsDataUrl, ProcessedMediaFile } from '../utils/firebaseStorage';

export interface RecentUploadItem {
  id: string;
  name: string;
  dataUrl: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  timestamp: number;
}

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: ProcessedMediaFile[]) => void;
  maxFiles?: number;
  currentStagedCount?: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const RECENT_UPLOADS_STORAGE_KEY = 'agni_recent_media_uploads';

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectFiles,
  maxFiles = 5,
  currentStagedCount = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recent uploads from localStorage
  const [recentUploads, setRecentUploads] = useState<RecentUploadItem[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_UPLOADS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).slice(0, 12);
      }
    } catch {}
    return [];
  });

  if (!isOpen) return null;

  const saveRecentUpload = (item: RecentUploadItem) => {
    try {
      // Keep only thumbnail or small preview in storage to avoid quota issues
      const previewUrl = item.thumbnailUrl || item.dataUrl;
      const compactItem: RecentUploadItem = {
        ...item,
        dataUrl: previewUrl.length > 500000 ? previewUrl.slice(0, 500000) : previewUrl,
        thumbnailUrl: item.thumbnailUrl ? (item.thumbnailUrl.length > 200000 ? item.thumbnailUrl.slice(0, 200000) : item.thumbnailUrl) : undefined,
      };

      const updated = [compactItem, ...recentUploads.filter((r) => r.id !== item.id)].slice(0, 10);
      setRecentUploads(updated);
      localStorage.setItem(RECENT_UPLOADS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // quota or storage error handled silently
    }
  };

  const handleFiles = async (filesList: FileList | File[]) => {
    setErrorMsg(null);
    const files = Array.from(filesList);
    if (files.length === 0) return;

    const availableSlots = maxFiles - currentStagedCount;
    if (availableSlots <= 0) {
      setErrorMsg(`Maximum of ${maxFiles} items per message reached.`);
      return;
    }

    if (files.length > availableSlots) {
      setErrorMsg(`You can only add ${availableSlots} more file(s). Taking the first ${availableSlots}.`);
    }

    const filesToProcess = files.slice(0, availableSlots);
    setIsProcessing(true);

    try {
      const processed: ProcessedMediaFile[] = [];

      for (const file of filesToProcess) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const isVideo = file.type.startsWith('video/') || ['mp4', 'mov'].includes(fileExt);
        const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);

        if (!isImage && !isVideo) {
          setErrorMsg(`Unsupported file type "${file.name}". Supported: JPG, PNG, WEBP, MP4, MOV.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setErrorMsg(`File "${file.name}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
          continue;
        }

        let dataUrl = '';
        let thumbnailUrl: string | undefined = undefined;

        if (isVideo) {
          // Extract first frame
          const frame = await extractVideoFirstFrame(file);
          thumbnailUrl = frame || undefined;
          dataUrl = URL.createObjectURL(file); // Playable object URL
        } else {
          dataUrl = await readFileAsDataUrl(file);
          thumbnailUrl = dataUrl;
        }

        const processedItem: ProcessedMediaFile = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          type: isVideo ? 'video' : 'image',
          mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          name: file.name,
          size: file.size,
          dataUrl,
          thumbnailUrl,
        };

        processed.push(processedItem);

        // Save to recents
        saveRecentUpload({
          id: processedItem.id,
          name: processedItem.name,
          dataUrl: processedItem.dataUrl,
          thumbnailUrl: processedItem.thumbnailUrl,
          type: processedItem.type,
          mimeType: processedItem.mimeType,
          size: processedItem.size,
          timestamp: Date.now(),
        });
      }

      if (processed.length > 0) {
        onSelectFiles(processed);
        onClose();
      }
    } catch (err: any) {
      console.error('Error processing media files:', err);
      setErrorMsg('Failed to process one or more files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecentClick = (recent: RecentUploadItem) => {
    if (currentStagedCount >= maxFiles) {
      setErrorMsg(`Maximum of ${maxFiles} items per message reached.`);
      return;
    }

    // Convert recent item to a virtual file for staging
    const virtualProcessed: ProcessedMediaFile = {
      id: `media-recent-${Date.now()}`,
      file: new File([], recent.name, { type: recent.mimeType }),
      type: recent.type,
      mimeType: recent.mimeType,
      name: recent.name,
      size: recent.size,
      dataUrl: recent.dataUrl,
      thumbnailUrl: recent.thumbnailUrl,
    };

    onSelectFiles([virtualProcessed]);
    onClose();
  };

  const clearRecents = () => {
    setRecentUploads([]);
    localStorage.removeItem(RECENT_UPLOADS_STORAGE_KEY);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7 text-neutral-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white sm:text-lg">Add media and files</h3>
              <p className="text-xs text-neutral-400">Upload whatever you want</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashed Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
              : 'border-orange-500/40 bg-orange-500/5 hover:border-orange-500 hover:bg-orange-500/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(e.target.files);
              }
            }}
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-800 group-hover:bg-neutral-700 text-orange-400 group-hover:scale-110 transition shadow-inner">
            <Upload className="h-6 w-6" />
          </div>

          <p className="mt-3 text-sm font-semibold text-white">Click to browse, or drag & drop here</p>
          <p className="mt-1 text-xs text-neutral-400">JPG, PNG, WEBP, MP4, MOV (max 10MB each, up to {maxFiles} files)</p>

          {isProcessing && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-orange-400">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
              <span>Processing media frames...</span>
            </div>
          )}
        </div>

        {/* Recent Uploads Section */}
        {recentUploads.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-neutral-300">Recent uploads</span>
              <button
                type="button"
                onClick={clearRecents}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700">
              {recentUploads.map((rec) => {
                const previewSrc = rec.thumbnailUrl || rec.dataUrl;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => handleRecentClick(rec)}
                    title={`Use ${rec.name}`}
                    className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800 hover:border-orange-500 transition-all cursor-pointer"
                  >
                    {previewSrc ? (
                      <img src={previewSrc} alt={rec.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        {rec.type === 'video' ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                      </div>
                    )}
                    {rec.type === 'video' && (
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 text-[9px] font-bold text-white">
                        VID
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-neutral-800 text-xs text-neutral-400">
          <span>{currentStagedCount} / {maxFiles} files staged</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Select Files</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadModal;
