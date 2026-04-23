'use client';

import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) {
        h = Math.round(h * maxWidth / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function UploadStep() {
  const setUserImage = useAppStore((s) => s.setUserImage);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件！');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片不能超过10MB！');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConfirm = async () => {
    if (!preview) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(preview, 800, 0.7);
      const file = albumInputRef.current?.files?.[0] || cameraInputRef.current?.files?.[0];
      if (file) setUserImage(compressed, file);
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 mt-6 px-4">
      {/* POW! Title */}
      <div className="relative text-center animate-bounce-in">
        <div
          className="text-[3.5rem] font-black leading-none tracking-tighter text-[#e00]"
          style={{ WebkitTextStroke: '3px #000', fontStyle: 'italic', transform: 'rotate(-3deg)' }}
        >
          跟名人
        </div>
        <div className="text-[2rem] font-black mt-1">
          合<span className="text-[#e00]">影</span>！
        </div>
      </div>

      {/* Speech bubble subtitle */}
      <div className="relative bg-white comic-border rounded-xl px-4 py-2 max-w-[280px] text-center">
        <p className="text-sm font-bold">
          上传自拍 → 选名人 → <span className="text-[#e00]">AI秒出！</span>
        </p>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l-4 border-t-4 border-black transform rotate-45" />
      </div>

      {/* Upload Area */}
      <div
        className={`w-full aspect-[3/4] max-w-[280px] rounded-xl comic-border transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden bg-white ${
          dragging ? 'border-[#e00] bg-[#e00]/5' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) processFile(file);
        }}
        onClick={() => !preview && albumInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className="text-7xl">📸</div>
            <p className="text-sm font-bold text-black/60">点击上传或拖拽照片</p>
            <p className="text-xs text-black/30">JPG/PNG · 最大10MB</p>
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
      />

      {error && (
        <div className="bg-[#e00] text-white font-bold text-sm px-4 py-2 comic-border">
          ⚠️ {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-[280px]">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 py-3 bg-[#0cf] comic-border-thin font-black text-sm comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          📷 拍照
        </button>
        <button
          onClick={() => albumInputRef.current?.click()}
          className="flex-1 py-3 bg-[#ff0] comic-border-thin font-black text-sm comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          🖼️ 相册
        </button>
      </div>

      {preview && (
        <button
          onClick={handleConfirm}
          disabled={compressing}
          className="w-full max-w-[280px] py-3.5 bg-[#e00] text-white comic-border font-black text-base comic-shadow animate-wiggle hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-70"
        >
          {compressing ? '⏳ 压缩中...' : '✅ 用这张照片！'}
        </button>
      )}

      {/* Example preview tags */}
      <div className="flex gap-2 mt-2 flex-wrap justify-center">
        {['💃 Taylor', '🚀 Musk', '⚽ Messi', '🕷️ Spider-Man'].map((label) => (
          <span key={label} className="px-3 py-1 bg-white comic-border-thin text-xs font-bold">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
