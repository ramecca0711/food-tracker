'use client';

import { useState, useRef } from 'react';

interface Props {
  onResult: (data: any) => void;
  onClose: () => void;
}

// Convert a File to a raw base64 string (strips the "data:...;base64," prefix).
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// Modal overlay for scanning a nutrition facts label.
//
// Flow:
//   1. User taps the button — device camera opens via file input with capture="environment"
//   2. Image is converted to base64 and sent to /api/parse-nutrition-label
//   3. GPT-4o-mini vision reads the exact values from the label
//   4. REVIEW STEP — user can edit the product name before applying
//   5. "Use This" → passes data (with corrected name) to parent as authoritative nutrition data
//   6. "Retake" → returns to scan state, clearing the previous result
//
// The returned values are treated as user-verified facts (provided_by_user: true)
// and will never be overridden by the cache/OFF/AI lookup chain.
export default function NutritionLabelCapture({ onResult, onClose }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview]           = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // After a successful parse, we hold the result here for the user to review/edit
  // before applying — rather than applying it immediately.
  const [pendingResult, setPendingResult] = useState<any | null>(null);
  const [editingName, setEditingName]     = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset back to the capture state, discarding any pending result.
  const resetToCapture = () => {
    setPendingResult(null);
    setEditingName('');
    setPreview(null);
    setError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the user can re-capture after an error without selecting a new file
    if (fileInputRef.current) fileInputRef.current.value = '';

    setError(null);
    setIsProcessing(true);
    setPendingResult(null);

    // Show preview immediately while the AI processes the image
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const imageBase64 = await fileToBase64(file);
      const mimeType    = file.type || 'image/jpeg';

      const res  = await fetch('/api/parse-nutrition-label', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Could not read the nutrition label. Try a clearer photo.');
        setIsProcessing(false);
        return;
      }

      // Enter review step — let the user confirm/fix the name before applying
      setPendingResult(data);
      setEditingName(data.food_name || '');
      setIsProcessing(false);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setIsProcessing(false);
    }
  };

  // Confirm the review step — apply the data (with the possibly-edited name) to the parent.
  const handleConfirm = () => {
    if (!pendingResult) return;
    onResult({
      ...pendingResult,
      food_name: editingName.trim() || pendingResult.food_name,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {pendingResult ? 'Review Label' : 'Scan Nutrition Label'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingResult
                ? 'Edit the name if needed, then tap Use This'
                : 'Values read by AI exactly as shown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── REVIEW STEP ─────────────────────────────────────────────────── */}
        {pendingResult ? (
          <div className="space-y-4">
            {/* Keep the image preview visible so the user can cross-reference */}
            {preview && (
              <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={preview}
                  alt="Nutrition label preview"
                  className="w-full object-contain max-h-36"
                />
              </div>
            )}

            {/* Editable product name — AI may not know the product name from the label alone */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Product name
              </label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoFocus
              />
            </div>

            {/* Read-only macro summary pulled from the label */}
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'cal',     value: pendingResult.calories },
                { label: 'protein', value: `${pendingResult.protein}g` },
                { label: 'fat',     value: `${pendingResult.fat}g` },
                { label: 'carbs',   value: `${pendingResult.carbs}g` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="font-semibold text-gray-900 text-sm">{value}</div>
                  <div className="text-[11px] text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Use This
              </button>
              <button
                onClick={resetToCapture}
                className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                Retake
              </button>
            </div>
          </div>

        ) : (
          /* ── CAPTURE STEP ────────────────────────────────────────────────── */
          <>
            <p className="text-sm text-gray-500 mb-4">
              Take a clear, well-lit photo of the full nutrition facts panel.
              All values will be read exactly as shown on the label.
            </p>

            {/* Preview of the captured image while processing */}
            {preview && (
              <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={preview}
                  alt="Nutrition label preview"
                  className="w-full object-contain max-h-52"
                />
              </div>
            )}

            {/* Processing state */}
            {isProcessing && (
              <div className="text-center py-3 mb-3">
                <div className="text-2xl mb-1 animate-spin inline-block">⏳</div>
                <p className="text-sm text-gray-500">Reading nutrition values…</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-500 mb-4 text-center bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Camera capture button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-3 font-medium transition-colors"
            >
              {/* Camera icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {preview ? 'Retake Photo' : 'Take Photo of Label'}
            </button>

            {/* Hidden file input wired to the device camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}

      </div>
    </div>
  );
}
