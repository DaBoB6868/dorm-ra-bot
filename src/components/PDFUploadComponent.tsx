'use client';

import React, { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: Date;
}

interface PDFUploadProps {
  onUploadSuccess?: (files: UploadedFile[]) => void;
}

export function PDFUploadComponent({ onUploadSuccess }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setError(null);

    if (files.length === 0) return;

    const file = files[0]; // Handle one file at a time

    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
      };

      setUploadedFiles((prev) => [...prev, uploadedFile]);

      if (onUploadSuccess) {
        onUploadSuccess([...uploadedFiles, uploadedFile]);
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Upload Community Guides
      </h2>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />

        <div onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-12 h-12 mx-auto mb-3 text-indigo-600" />
          <p className="text-lg font-semibold text-gray-700 mb-1">
            Drop your PDF here or click to browse
          </p>
          <p className="text-sm text-gray-700">
            Upload community guides, policies, and residential information
          </p>

          {uploading && (
            <div className="mt-4">
              <div className="inline-block">
                <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-sm text-indigo-600 mt-2">Uploading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start space-x-2">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Upload Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Uploaded Documents ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-700">
                      {(file.size / 1024).toFixed(2)} KB • Uploaded at{' '}
                      {file.uploadedAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  ✓ Processed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length === 0 && (
        <p className="mt-6 text-center text-gray-700 text-sm">
          No documents uploaded yet. Start by uploading a PDF with community
          guides.
        </p>
      )}
    </div>
  );
}
