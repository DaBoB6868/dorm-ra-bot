"use client";

import React, { useState } from "react";

export function RecycleChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-4 bg-slate-50 rounded-md shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Sustainability Checker</h3>
      <p className="text-sm text-slate-600 mb-3">Upload a photo to check if an item is likely recyclable or compostable.</p>

      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="block"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

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
