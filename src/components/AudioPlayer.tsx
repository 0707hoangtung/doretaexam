import React, { useState, useEffect } from 'react';
import { Volume2, Loader2, AlertCircle } from 'lucide-react';
import { resolveAudioUrl } from '../utils/mediaStorage';

interface AudioPlayerProps {
  src?: string | null;
  audioName?: string;
  className?: string;
  compact?: boolean;
  onDelete?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  audioName,
  className = '',
  compact = false,
  onDelete,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    if (!src.startsWith('cloud-media://')) return src;
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return Boolean(src && src.startsWith('cloud-media://'));
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!src.startsWith('cloud-media://')) {
      setResolvedSrc(src);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    resolveAudioUrl(src)
      .then((url) => {
        if (!isMounted) return;
        if (url && !url.startsWith('cloud-media://')) {
          setResolvedSrc(url);
        } else {
          setError('Không thể tải file âm thanh.');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error resolving audio URL:', err);
        setError('Lỗi khi tải file nghe.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-2.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 shrink-0">
        <Volume2 className="w-4 h-4 shrink-0" />
        <span className="max-w-[200px] truncate" title={audioName || 'File âm thanh'}>
          {audioName ? `File nghe: ${audioName}` : 'File âm thanh bài thi:'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-1 px-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Đang nạp file âm thanh từ Đám mây...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 py-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      ) : resolvedSrc ? (
        <audio
          controls
          src={resolvedSrc}
          className={`${compact ? 'h-7 max-w-[240px]' : 'h-8 max-w-full sm:max-w-[280px]'}`}
        />
      ) : null}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 ml-auto transition-colors"
        >
          Xóa âm thanh
        </button>
      )}
    </div>
  );
};
