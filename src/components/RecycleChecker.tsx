"use client";

import React, { useState, useRef } from "react";
import { Leaf, Recycle, Camera, Upload, Loader, ImageIcon } from "lucide-react";

/** Resize / compress an image file to a max dimension & JPEG quality */
async function compressImage(file: File, maxDim = 1024, quality = 0.7): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file); // fallback to original
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file); // fallback
    img.src = url;
  });
}

export function RecycleChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  /** Process a picked / captured file: compress then set state */
  async function handleFile(raw: File | null | undefined) {
    if (!raw) return;
    setError(null);
    setResult(null);
    const compressed = await compressImage(raw);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/recycle", { method: "POST", body: fd });
      if (res.status === 429) throw new Error("Too many checks! Please wait a moment and try again.");
      if (res.status === 413) throw new Error("Image too large. Try taking a photo at lower resolution.");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-gradient-to-b from-green-50 to-white rounded-xl shadow-md border border-green-100 overflow-hidden">
      {/* Header with logos */}
      <div className="bg-green-700 text-white px-4 py-3 sm:py-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-1 sm:mb-2">
          <Recycle className="w-6 h-6 sm:w-8 sm:h-8" />
          <Leaf className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold">♻️ Recycle or Compost?</h3>
        <p className="text-green-100 text-xs sm:text-sm mt-1">Snap a photo and we&apos;ll tell you what to do with it!</p>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          {/* Hidden native file inputs */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          {/* Preview */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-green-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full max-h-48 object-contain bg-gray-50" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-green-300 rounded-xl text-center">
              <ImageIcon className="w-8 h-8 text-green-300" />
              <span className="text-sm text-gray-500 font-medium">No photo selected</span>
            </div>
          )}

          {/* Action buttons — two pickers + submit */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            {/* Mobile: opens native camera; Desktop: opens file picker */}
            <button
              type="button"
              onClick={() => {
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                  cameraRef.current?.click();
                } else {
                  galleryRef.current?.click();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:bg-green-800 active:scale-[0.98] transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="sm:hidden">Take Photo</span>
              <span className="hidden sm:inline">Upload Photo</span>
            </button>
            {/* Gallery button — mobile only (on desktop, Upload Photo already opens file picker) */}
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex sm:hidden items-center justify-center gap-1.5 px-3 py-3 bg-green-100 text-green-800 rounded-xl text-sm font-semibold hover:bg-green-200 active:bg-green-300 active:scale-[0.98] transition-all"
            >
              <Upload className="w-4 h-4" />
              Gallery
            </button>
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Recycle className="w-4 h-4" />}
            {loading ? "Checking…" : "Check It"}
          </button>
        </form>

        {/* Error */}
        {error && <div className="text-red-600 text-sm mt-3 bg-red-50 p-2 rounded-lg">{error}</div>}

        {/* Results */}
        {result && (
          <div className="mt-3 bg-white border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{result.classification?.toLowerCase().includes('recycle') ? '♻️' : result.classification?.toLowerCase().includes('compost') ? '🌱' : '🗑️'}</span>
              <span className="font-bold text-gray-900 text-lg">{result.classification}</span>
            </div>
            {result.labels && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Detected:</p>
                <div className="flex flex-wrap gap-1">
                  {result.labels.map((l: string) => (
                    <span key={l} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
            )}
            {result.tips && (
              <p className="mt-2 text-sm text-gray-700 bg-green-50 p-2 rounded">{result.tips}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecycleChecker;
