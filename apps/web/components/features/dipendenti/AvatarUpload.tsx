'use client';

import { useState, useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadDipendenteAvatar, deleteDipendenteAvatar, getAvatarUrl } from '@/lib/utils/image-upload';

type AvatarUploadProps = {
  tenantId: string;
  dipendenteId?: string;
  initialAvatarUrl?: string | null;
  nome: string;
  cognome: string;
  onAvatarChange?: (avatarUrl: string | null) => void;
};

export function AvatarUpload({
  tenantId,
  dipendenteId,
  initialAvatarUrl,
  nome,
  cognome,
  onAvatarChange,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const n = nome?.charAt(0).toUpperCase() || '';
    const c = cognome?.charAt(0).toUpperCase() || '';
    return `${n}${c}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Per favore seleziona un\'immagine valida');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('L\'immagine è troppo grande. Massimo 10MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // If we have a dipendente ID, upload immediately
    if (dipendenteId) {
      try {
        setUploading(true);
        const uploadedPath = await uploadDipendenteAvatar(file, tenantId, dipendenteId);
        const publicUrl = await getAvatarUrl(uploadedPath);

        setAvatarUrl(publicUrl);
        setPreviewUrl(null);

        if (onAvatarChange) {
          onAvatarChange(uploadedPath);
        }

        toast.success('Avatar caricato con successo');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Errore nel caricamento dell\'avatar');
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!dipendenteId) {
      setAvatarUrl(null);
      setPreviewUrl(null);
      if (onAvatarChange) {
        onAvatarChange(null);
      }
      return;
    }

    try {
      setUploading(true);
      await deleteDipendenteAvatar(tenantId, dipendenteId);
      setAvatarUrl(null);
      setPreviewUrl(null);

      if (onAvatarChange) {
        onAvatarChange(null);
      }

      toast.success('Avatar rimosso');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Errore nella rimozione dell\'avatar');
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-100 bg-emerald-50 flex items-center justify-center">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={`${nome} ${cognome}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-emerald-600">
              {getInitials()}
            </span>
          )}
        </div>

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Cambia
          </Button>
        </div>

        {/* Remove Button */}
        {(displayUrl) && !uploading && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="Rimuovi avatar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!displayUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Caricamento...' : 'Carica Foto'}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Formati supportati: JPG, PNG, WebP, HEIC
          <br />
          Massimo 10MB - L&apos;immagine sarà ottimizzata automaticamente
        </p>
      </div>
    </div>
  );
}
