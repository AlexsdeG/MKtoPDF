import React, { useRef } from 'react';
import { X, Upload, Copy, Trash2, PlusCircle, Image as ImageIcon } from 'lucide-react';
import { SessionImageAsset, buildInternalImageUrl } from '../lib/sessionImages';
import { toast } from 'sonner';

interface ImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SessionImageAsset[];
  onUploadFile: (file: File) => Promise<SessionImageAsset | null>;
  onInsertImage: (imageId: string, imageName?: string) => void;
  onDeleteImage: (imageId: string) => void;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export const ImageManagerModal: React.FC<ImageManagerModalProps> = ({
  isOpen,
  onClose,
  images,
  onUploadFile,
  onInsertImage,
  onDeleteImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      await onUploadFile(file);
    }
    event.target.value = '';
  };

  const handleCopyUrl = async (id: string) => {
    const url = buildInternalImageUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Internal image URL copied');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Images</h3>
            <p className="text-xs text-gray-500">Stored in memory only. Cleared on refresh.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 border-b border-gray-100">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handlePickFiles}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Upload size={16} />
            Upload Images
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5 space-y-3">
          {images.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <ImageIcon className="mx-auto text-gray-400" size={24} />
              <p className="mt-2 text-sm text-gray-600">No session images yet.</p>
            </div>
          ) : (
            images.map((img) => (
              <div key={img.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <img
                  src={img.objectUrl}
                  alt={img.name}
                  className="w-14 h-14 object-cover rounded-md border border-gray-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{img.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(img.size)} · {img.mimeType}</p>
                  <p className="text-xs text-gray-500 truncate">{buildInternalImageUrl(img.id)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onInsertImage(img.id, img.name)}
                    className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                    title="Insert markdown"
                  >
                    <PlusCircle size={16} />
                  </button>
                  <button
                    onClick={() => handleCopyUrl(img.id)}
                    className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                    title="Copy internal URL"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    className="p-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    title="Delete image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};