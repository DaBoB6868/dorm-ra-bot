'use client';

import { useState } from 'react';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  frontDeskName?: string | null;
}

export function ScheduleModal({ open, onClose, frontDeskName }: ScheduleModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [when, setWhen] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, when, frontDeskName }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult('Request submitted — the RA will follow up.');
      } else {
        setResult(data?.error || 'Failed to submit request');
      }
    } catch (e) {
      setResult('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-2">Schedule time with an RA</h3>
        <p className="text-sm text-gray-800 mb-4">Front desk: {frontDeskName ?? 'Unspecified'}</p>

        <input className="w-full mb-2 p-2 border rounded" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full mb-2 p-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full mb-4 p-2 border rounded" placeholder="Preferred time (e.g., 2026-02-07 14:00)" value={when} onChange={(e) => setWhen(e.target.value)} />

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-red-700 text-white">{loading ? 'Sending...' : 'Request'}</button>
        </div>

        {result && <p className="mt-3 text-sm">{result}</p>}
      </div>
    </div>
  );
}
