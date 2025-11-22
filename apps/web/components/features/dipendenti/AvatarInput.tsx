'use client';

import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

type AvatarInputProps = {
  nome: string;
  cognome: string;
  onFileChange: (file: File | null) => void;
};

export function AvatarInput({ nome, cognome, onFileChange }: AvatarInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const n = nome?.charAt(0).toUpperCase() || '';
    const c = cognome?.charAt(0).toUpperCase() || '';
    return `${n}${c}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Pass file to parent
    onFileChange(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative group">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-50 flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${nome} ${cognome}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-emerald-600">
              {getInitials()}
            </span>
          )}
        </div>

        {/* Remove Button */}
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="Rimuovi foto"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Upload Button */}
      <div className="w-full text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors w-full"
        >
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">
            {previewUrl ? 'Cambia' : 'Carica'}
          </span>
        </button>
        <p className="text-xs text-muted-foreground mt-2 leading-tight">
          JPG, PNG, WebP, HEIC<br />Max 10MB
        </p>
      </div>
    </div>
  );
}
