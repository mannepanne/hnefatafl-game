import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type PieceView = 'front' | 'back' | 'left' | 'right';
export type PieceType = 'king' | 'warrior';

const BUCKET = 'piece-textures';

/** Build the public URL for a piece texture in Supabase Storage.
 *  An optional `version` token is appended as a query param to bust the
 *  browser, CDN, and Three.js caches when the underlying file changes. */
export function getTextureUrl(
  pieceType: PieceType,
  view: PieceView,
  version?: string,
): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${pieceType}/${view}.png`);
  return version ? `${data.publicUrl}?v=${version}` : data.publicUrl;
}

/** Check which textures exist for a piece type */
export function usePieceTextureStatus(pieceType: PieceType) {
  const [status, setStatus] = useState<Record<PieceView, boolean>>({
    front: false,
    back: false,
    left: false,
    right: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(pieceType);

      if (cancelled) return;

      if (error || !data) {
        setLoading(false);
        return;
      }

      const fileNames = new Set(data.map(f => f.name));
      setStatus({
        front: fileNames.has('front.png'),
        back: fileNames.has('back.png'),
        left: fileNames.has('left.png'),
        right: fileNames.has('right.png'),
      });
      setLoading(false);
    }

    check();
    return () => { cancelled = true; };
  }, [pieceType]);

  const allUploaded = status.front && status.back && status.left && status.right;

  return { status, loading, allUploaded, refresh: () => setLoading(true) };
}

/** Upload a piece texture */
export async function uploadPieceTexture(
  pieceType: PieceType,
  view: PieceView,
  file: File,
): Promise<{ success: boolean; error?: string }> {
  const path = `${pieceType}/${view}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
