'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/image-upload';
import { ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostImageManagerProps {
  postId: string;
  currentImageUrl?: string;
  onImageUpdated?: (imageUrl: string | null) => void;
  className?: string;
}

export function PostImageManager({ postId, currentImageUrl, onImageUpdated, className }: PostImageManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl || null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleImageUploaded = (newImageUrl: string) => {
    setImageUrl(newImageUrl);
    onImageUpdated?.(newImageUrl);
    setIsOpen(false);
  };

  const removeImage = async () => {
    if (!imageUrl) return;

    setIsRemoving(true);
    try {
      // Extract the file path from the URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex((part) => part === 'images');

      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');

        // Delete from storage
        const deleteResponse = await fetch(`/api/upload-image?path=${encodeURIComponent(filePath)}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete image from storage');
        }
      }

      // Update the post to remove the image reference
      const updateResponse = await fetch('/api/posts-history', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: postId,
          metadata: { image_url: null, image_path: null, image_filename: null },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update post');
      }

      setImageUrl(null);
      onImageUpdated?.(null);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {imageUrl ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <img src={imageUrl} alt="Post image" className="w-8 h-8 object-cover rounded border" />
            <Button onClick={removeImage} disabled={isRemoving} variant="destructive" size="sm" className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full">
              <X className="h-2 w-2" />
            </Button>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                Change
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Change Post Image</DialogTitle>
              </DialogHeader>
              <ImageUpload onImageUploaded={handleImageUploaded} postId={postId} maxFiles={1} className="mt-4" />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <ImageIcon className="h-3 w-3 mr-1" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Image to Post</DialogTitle>
            </DialogHeader>
            <ImageUpload onImageUploaded={handleImageUploaded} postId={postId} maxFiles={1} className="mt-4" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
