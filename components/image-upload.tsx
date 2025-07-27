'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string, filePath: string, fileName: string) => void;
  postId?: string;
  folder?: string;
  className?: string;
  disabled?: boolean;
  maxFiles?: number;
  acceptedTypes?: string[];
}

interface UploadedImage {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export function ImageUpload({
  onImageUploaded,
  postId,
  folder = 'post-images',
  className,
  disabled = false,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    // Check if adding these files would exceed the limit
    if (uploadedImages.length + filesArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    uploadFiles(filesArray);
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, GIF, and WebP images are allowed.`);
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        if (postId) {
          formData.append('postId', postId);
        }

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return {
          url: data.imageUrl,
          path: data.filePath,
          name: data.fileName,
          size: data.fileSize,
          type: data.fileType,
        };
      });

      const results = await Promise.all(uploadPromises);

      setUploadedImages((prev) => [...prev, ...results]);

      // Call callback for each uploaded image
      results.forEach((image) => {
        onImageUploaded?.(image.url, image.path, image.name);
      });
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (imagePath: string) => {
    try {
      const response = await fetch(`/api/upload-image?path=${encodeURIComponent(imagePath)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      setUploadedImages((prev) => prev.filter((img) => img.path !== imagePath));
    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400',
          uploadedImages.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && uploadedImages.length < maxFiles && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || uploadedImages.length >= maxFiles}
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {uploadedImages.length >= maxFiles ? `Maximum ${maxFiles} images reached` : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, GIF, WebP up to 5MB ({uploadedImages.length}/{maxFiles})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={() => setError(null)} variant="ghost" size="sm" className="mt-2 text-red-600 hover:text-red-700 h-6 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Images ({uploadedImages.length})</h4>
          <div className="grid grid-cols-2 gap-3">
            {uploadedImages.map((image, index) => (
              <div key={image.path} className="relative group border rounded-lg overflow-hidden">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <p className="text-xs text-center px-2">{image.name}</p>
                  </div>
                </div>

                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                  <p className="text-xs font-medium truncate">{image.name}</p>
                  <p className="text-xs text-gray-300">{formatFileSize(image.size)}</p>
                </div>

                {/* Remove Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.path);
                  }}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
