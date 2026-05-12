import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, Check, Image } from 'lucide-react';
import type { PieceView, PieceType } from '@/hooks/usePieceTextures';
import { uploadPieceTexture, getTextureUrl } from '@/hooks/usePieceTextures';
import { supabase } from '@/lib/supabase';

const VIEWS: { key: PieceView; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

function DropSlot({
  pieceType,
  view,
  label,
  uploaded,
  onUploaded,
}: {
  pieceType: PieceType;
  view: PieceView;
  label: string;
  uploaded: boolean;
  onUploaded: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uploaded) {
      setPreviewUrl(getTextureUrl(pieceType, view) + `?t=${Date.now()}`);
    }
  }, [uploaded, pieceType, view]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file.');
        return;
      }
      setUploading(true);
      const result = await uploadPieceTexture(pieceType, view, file);
      setUploading(false);

      if (result.success) {
        toast.success(`${label} view uploaded.`);
        setPreviewUrl(URL.createObjectURL(file));
        onUploaded();
      } else {
        toast.error(result.error ?? 'Upload failed.');
      }
    },
    [pieceType, view, label, onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative rounded-lg border-2 border-dashed transition-all aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden ${
        dragging
          ? 'border-[#b8860b] bg-[#b8860b]/10'
          : uploaded
            ? 'border-green-600/40 bg-green-50/50'
            : 'border-[#c4b8a8] bg-white/50 hover:border-[#8b7a68]'
      }`}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      ) : null}

      <div className={`relative z-10 flex flex-col items-center gap-1 ${previewUrl ? 'bg-black/40 rounded-lg px-2 py-1' : ''}`}>
        {uploading ? (
          <div className="w-5 h-5 border-2 border-[#b8860b] border-t-transparent rounded-full animate-spin" />
        ) : uploaded ? (
          <Check className={`w-4 h-4 ${previewUrl ? 'text-green-300' : 'text-green-600'}`} />
        ) : (
          <Upload className="w-4 h-4 text-[#8b7a68]" />
        )}
        <span
          className={`text-[10px] tracking-wider uppercase font-semibold ${previewUrl ? 'text-white' : 'text-[#8b7a68]'}`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default function TextureManager() {
  const [kingStatus, setKingStatus] = useState<Record<PieceView, boolean>>({
    front: false, back: false, left: false, right: false,
  });
  const [warriorStatus, setWarriorStatus] = useState<Record<PieceView, boolean>>({
    front: false, back: false, left: false, right: false,
  });
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    const [kingRes, warriorRes] = await Promise.all([
      supabase.storage.from('piece-textures').list('king'),
      supabase.storage.from('piece-textures').list('warrior'),
    ]);

    const kingFiles = new Set((kingRes.data ?? []).map(f => f.name));
    const warriorFiles = new Set((warriorRes.data ?? []).map(f => f.name));

    setKingStatus({
      front: kingFiles.has('front.png'),
      back: kingFiles.has('back.png'),
      left: kingFiles.has('left.png'),
      right: kingFiles.has('right.png'),
    });
    setWarriorStatus({
      front: warriorFiles.has('front.png'),
      back: warriorFiles.has('back.png'),
      left: warriorFiles.has('left.png'),
      right: warriorFiles.has('right.png'),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const kingComplete = kingStatus.front && kingStatus.back && kingStatus.left && kingStatus.right;
  const warriorComplete = warriorStatus.front && warriorStatus.back && warriorStatus.left && warriorStatus.right;

  if (loading) {
    return (
      <div className="text-center py-4 text-[#8b7a68] text-sm">Loading textures...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* King textures */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Image className="w-4 h-4 text-[#8b4513]" />
          <h4 className="text-[#3a2a1a] text-xs tracking-[0.15em] uppercase font-semibold">
            King Piece
          </h4>
          {kingComplete && (
            <span className="text-[9px] tracking-wider uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
              Complete
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {VIEWS.map(v => (
            <DropSlot
              key={`king-${v.key}`}
              pieceType="king"
              view={v.key}
              label={v.label}
              uploaded={kingStatus[v.key]}
              onUploaded={checkStatus}
            />
          ))}
        </div>
      </div>

      {/* Warrior textures */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Image className="w-4 h-4 text-[#8b4513]" />
          <h4 className="text-[#3a2a1a] text-xs tracking-[0.15em] uppercase font-semibold">
            Warrior Piece
          </h4>
          {warriorComplete && (
            <span className="text-[9px] tracking-wider uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
              Complete
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {VIEWS.map(v => (
            <DropSlot
              key={`warrior-${v.key}`}
              pieceType="warrior"
              view={v.key}
              label={v.label}
              uploaded={warriorStatus[v.key]}
              onUploaded={checkStatus}
            />
          ))}
        </div>
      </div>

      <p
        className="text-[#8b7a68] text-xs leading-relaxed"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Upload renders of each piece from all four angles. Images should have a plain white
        background — the white will be made transparent automatically. These textures are
        used when the ornate piece style is active.
      </p>
    </div>
  );
}
