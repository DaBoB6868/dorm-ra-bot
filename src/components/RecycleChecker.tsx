"use client";

import React, { useState } from "react";

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

      const res = await fetch("/api/recycle", {
        method: "POST",
        body: fd,
      });

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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
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
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const photoFile = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type });
      setFile(photoFile);
      stopCamera();
    }, 'image/jpeg');
  }

  return (
    <div className="w-full p-4 bg-slate-50 rounded-md shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Sustainability Checker</h3>
      <p className="text-sm text-slate-800 mb-3">Take or upload a photo to check if an item is recyclable or compostable.</p>

      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 items-stretch">
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (cameraActive ? stopCamera() : startCamera())}
            className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50 text-sm"
          >
            {cameraActive ? 'Stop Camera' : 'Use Camera'}
          </button>

          <button
            type="submit"
            disabled={!file || loading}
            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 text-sm"
          >
            {loading ? 'Checking…' : 'Check'}
          </button>
        </div>
      </form>

      {cameraActive && (
        <div className="mt-3">
          <video ref={videoRef} className="w-full rounded-md border" playsInline />
          <div className="flex gap-2 mt-2">
            <button onClick={capturePhoto} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded">Capture</button>
            <button onClick={stopCamera} className="flex-1 px-3 py-2 bg-gray-300 text-gray-800 rounded">Cancel</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {error && <div className="text-red-600 mt-2">{error}</div>}

      {result && (
        <div className="mt-3 text-sm">
          <div><strong>Classification:</strong> {result.classification}</div>
          {result.labels && (
            <div className="mt-2">
              <strong>Labels:</strong>
              <ul className="list-disc ml-5 mt-1">
                {result.labels.map((l: string) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          {result.tips && (
            <div className="mt-2"><strong>Tips:</strong> {result.tips}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecycleChecker;
