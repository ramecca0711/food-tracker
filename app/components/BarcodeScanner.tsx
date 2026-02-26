'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  onResult: (data: any) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Barcode detection helper
// ─────────────────────────────────────────────────────────────────────────────

// Attempt to decode a barcode from an image file using the browser-native
// BarcodeDetector API (Chrome/Android/macOS). Returns the barcode string
// (e.g. "0012345678905") or null if the API is unavailable or no barcode found.
async function detectBarcodeFromPhoto(file: File): Promise<string | null> {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93'],
    });
    const barcodes = await detector.detect(bitmap);
    bitmap.close();
    return barcodes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// Modal overlay for barcode scanning.
//
// Flow:
//   1. User taps "Take Photo" — device camera opens via file input with capture="environment"
//   2. Component tries the native BarcodeDetector API on the captured image
//   3. If detected → calls /api/lookup-barcode → returns nutrition data to parent
//   4. If not detected (or API unavailable) → shows manual barcode entry field
//
// The manual entry field is always visible as a fallback (required for iOS Safari
// which does not support the BarcodeDetector API).
export default function BarcodeScanner({ onResult, onClose }: Props) {
  const [manualBarcode, setManualBarcode]   = useState('');
  const [status, setStatus]                 = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call the server-side lookup route with a confirmed barcode number
  const lookupBarcode = useCallback(async (barcode: string) => {
    setIsLoading(true);
    setError(null);
    setStatus('Looking up product…');
    try {
      const res  = await fetch('/api/lookup-barcode', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ barcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Product not found. Try entering the barcode number manually.');
        setStatus(null);
        return;
      }
      // Success — hand nutrition data back to LogFoodView
      onResult(data);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setStatus(null);
    }
  }, [onResult]);

  // Handle a photo captured via the device camera
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = '';

    setError(null);
    setStatus('Detecting barcode…');

    const barcode = await detectBarcodeFromPhoto(file);
    if (barcode) {
      setStatus(`Found: ${barcode}`);
      await lookupBarcode(barcode);
    } else {
      // BarcodeDetector unavailable or couldn't find a code — prompt manual entry
      setStatus(null);
      setError(
        'Could not detect a barcode automatically. ' +
        'Try a clearer photo or enter the number below.'
      );
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    await lookupBarcode(manualBarcode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scan Barcode</h2>
            <p className="text-xs text-gray-400 mt-0.5">Looks up product in Open Food Facts</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Camera button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-3 font-medium transition-colors mb-4"
        >
          {/* Camera icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Take Photo of Barcode
        </button>

        {/* Hidden file input wired to the device camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoCapture}
        />

        {/* Status / error feedback */}
        {status && <p className="text-center text-sm text-gray-500 mb-3 animate-pulse">{status}</p>}
        {error  && <p className="text-center text-sm text-red-500 mb-3">{error}</p>}

        {/* Divider */}
        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-xs text-gray-400 font-medium">or enter manually</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Manual barcode entry — always visible as an iOS-safe fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Barcode number…"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            type="submit"
            disabled={!manualBarcode.trim() || isLoading}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
          >
            Look up
          </button>
        </form>

      </div>
    </div>
  );
}
