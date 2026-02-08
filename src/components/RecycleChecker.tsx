"use client";

import React, { useState } from "react";
import { Leaf, Recycle, Camera, Upload, Loader } from "lucide-react";

export function RecycleChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

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
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  function stopCamera() {
    setCameraActive(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setFile(new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type }));
      stopCamera();
    }, "image/jpeg");
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
          {/* File / camera upload */}
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3.5 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 active:bg-green-100 transition-all">
            <Upload className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-800 font-medium">
              {file ? file.name : "Choose or take a photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="hidden"
            />
          </label>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (cameraActive ? stopCamera() : startCamera())}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:bg-green-800 active:scale-[0.98] transition-all"
            >
              <Camera className="w-4 h-4" />
              {cameraActive ? "Stop" : "Camera"}
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Recycle className="w-4 h-4" />}
              {loading ? "Checking…" : "Check It"}
            </button>
          </div>
        </form>

        {/* Camera viewfinder */}
        {cameraActive && (
          <div className="mt-3">
            <video ref={videoRef} className="w-full rounded-xl border-2 border-green-200" playsInline />
            <div className="flex gap-2 mt-2">
              <button onClick={capturePhoto} className="flex-1 px-3 py-2.5 bg-green-700 text-white rounded-xl font-semibold active:bg-green-800 active:scale-[0.98] transition-all">📸 Capture</button>
              <button onClick={stopCamera} className="flex-1 px-3 py-2.5 bg-gray-200 text-gray-800 rounded-xl font-semibold active:bg-gray-300 active:scale-[0.98] transition-all">Cancel</button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

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
