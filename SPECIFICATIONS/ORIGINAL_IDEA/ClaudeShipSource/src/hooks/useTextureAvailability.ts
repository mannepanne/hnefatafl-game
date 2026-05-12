import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'piece-textures';
const REQUIRED_VIEWS = ['front.png', 'back.png', 'left.png', 'right.png'];

interface PieceTextureInfo {
  ready: boolean;
  /** Cache-busting token — latest updated_at timestamp across all 4 views */
  version: string;
}

interface StorageFile {
  name: string;
  updated_at?: string | null;
  created_at?: string | null;
}

/** Latest timestamp across the required views, as a cache-bust token */
function maxVersion(files: StorageFile[]): string {
  let latest = 0;
  for (const f of files) {
    if (!REQUIRED_VIEWS.includes(f.name)) continue;
    const ts = f.updated_at ?? f.created_at;
    if (!ts) continue;
    const n = Date.parse(ts);
    if (!Number.isNaN(n) && n > latest) latest = n;
  }
  return latest === 0 ? '' : String(latest);
}

/** Checks if all 4 textures exist for king and/or warrior pieces */
export function useTextureAvailability() {
  const [king, setKing] = useState<PieceTextureInfo>({ ready: false, version: '' });
  const [warrior, setWarrior] = useState<PieceTextureInfo>({ ready: false, version: '' });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const [kingRes, warriorRes] = await Promise.all([
          supabase.storage.from(BUCKET).list('king'),
          supabase.storage.from(BUCKET).list('warrior'),
        ]);

        if (cancelled) return;

        const kingFiles = kingRes.data ?? [];
        const warriorFiles = warriorRes.data ?? [];

        const kingNames = new Set(kingFiles.map(f => f.name));
        const warriorNames = new Set(warriorFiles.map(f => f.name));

        setKing({
          ready: REQUIRED_VIEWS.every(v => kingNames.has(v)),
          version: maxVersion(kingFiles),
        });
        setWarrior({
          ready: REQUIRED_VIEWS.every(v => warriorNames.has(v)),
          version: maxVersion(warriorFiles),
        });
      } catch {
        // Storage not available, use fallback pieces
      }
      if (!cancelled) setChecked(true);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return {
    kingReady: king.ready,
    warriorReady: warrior.ready,
    kingVersion: king.version,
    warriorVersion: warrior.version,
    checked,
  };
}
