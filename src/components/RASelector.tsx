'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Mail, Building, ChevronDown, ChevronUp, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface RA {
  id: string;
  name: string;
  dorm: string;
  community: string;
  floor: number;
  email: string;
  available: boolean;
}

export function RASelector() {
  const [raList, setRaList] = useState<RA[]>([]);
  const [selectedRA, setSelectedRA] = useState<RA | null>(null);
  const [filterDorm, setFilterDorm] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  // Schedule form
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/ra-directory')
      .then((r) => r.json())
      .then((data) => setRaList(data))
      .catch(() => {});
  }, []);

  const dorms = useMemo(() => [...new Set(raList.map((r) => r.dorm))].sort(), [raList]);

  const filtered = useMemo(() => {
    if (!filterDorm) return raList;
    return raList.filter((r) => r.dorm === filterDorm);
  }, [raList, filterDorm]);

  const handleSchedule = async () => {
    if (!selectedRA || !studentName.trim() || !studentEmail.trim() || !preferredTime.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raId: selectedRA.id,
          raName: selectedRA.name,
          raEmail: selectedRA.email,
          raDorm: selectedRA.dorm,
          raFloor: selectedRA.floor,
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          preferredTime: preferredTime.trim(),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ ok: true, msg: data.message || 'Request sent! Your RA will receive an email.' });
        setStudentName('');
        setStudentEmail('');
        setPreferredTime('');
        setReason('');
      } else {
        setSubmitResult({ ok: false, msg: data.error || 'Failed to send request.' });
      }
    } catch {
      setSubmitResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-3 sm:py-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h3 className="font-bold text-base sm:text-lg">Find Your RA</h3>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Dorm filter */}
        <select
          value={filterDorm}
          onChange={(e) => { setFilterDorm(e.target.value); setSelectedRA(null); setShowSchedule(false); }}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-red-700 bg-white"
        >
          <option value="">All Dorms</option>
          {dorms.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* RA list */}
        <div className="space-y-2 max-h-60 sm:max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No RAs found</p>
          ) : (
            filtered.map((ra) => (
              <button
                key={ra.id}
                onClick={() => {
                  setSelectedRA(selectedRA?.id === ra.id ? null : ra);
                  setShowSchedule(false);
                  setSubmitResult(null);
                }}
                className={`w-full text-left p-3 sm:p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  selectedRA?.id === ra.id
                    ? 'border-red-700 bg-red-50 shadow-sm'
                    : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ra.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Building className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">{ra.dorm} · Floor {ra.floor}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ra.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {ra.available ? 'Available' : 'Busy'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected RA actions */}
        {selectedRA && (
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="w-3.5 h-3.5 text-red-700" />
              <span>{selectedRA.email}</span>
            </div>

            <button
              onClick={() => { setShowSchedule(!showSchedule); setSubmitResult(null); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800 active:bg-red-900 active:scale-[0.98] transition-all"
            >
              <Calendar className="w-4 h-4" />
              Schedule Appointment
              {showSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Schedule form */}
        {showSchedule && selectedRA && (
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-600">Scheduling with <strong>{selectedRA.name}</strong> ({selectedRA.dorm}, Floor {selectedRA.floor})</p>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-700"
            />
            <input
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Your email"
              type="email"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-700"
            />
            <input
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="Preferred date & time (e.g. Feb 10, 3 PM)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-700"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-700 resize-none"
            />
            <button
              onClick={handleSchedule}
              disabled={submitting || !studentName.trim() || !studentEmail.trim() || !preferredTime.trim()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800 active:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {submitting ? 'Sending...' : 'Send Request'}
            </button>

            {submitResult && (
              <div className={`flex items-start gap-2 p-2 rounded-lg text-sm ${submitResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {submitResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span>{submitResult.msg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RASelector;
