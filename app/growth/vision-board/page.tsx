'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { readLocalJson, writeLocalJson } from '@/lib/localPersistence';

type VisionImage = { id: string; name: string; src: string };
const VISION_BOARD_STORAGE_KEY = 'growth:vision-board:images';

export default function GrowthVisionBoardPage() {
  // Images are stored as DataURIs in local storage until backend storage is wired.
  const [images, setImages] = useState<VisionImage[]>([]);
  // Track which image is shown full-screen in the lightbox.
  const [lightboxImage, setLightboxImage] = useState<VisionImage | null>(null);
  // Feedback when the user saves the board manually.
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setImages(readLocalJson<VisionImage[]>(VISION_BOARD_STORAGE_KEY, []));
  }, []);

  // Convert a File to a DataURL so it can be stored and rendered without a server.
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Unable to read image'));
      reader.readAsDataURL(file);
    });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const nextImages = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        src: await fileToDataUrl(file),
      }))
    );
    // Prepend new images so the board always shows the newest additions first.
    setImages((prev) => [...nextImages, ...prev]);
    event.target.value = '';
  };

  // Persist the current board to local storage and show brief confirmation.
  const handleSave = () => {
    writeLocalJson(VISION_BOARD_STORAGE_KEY, images);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Vision Board</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Upload images and display them in your board.</p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Upload button */}
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white">
              Upload Images
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>

            {/* Save Board button — gives users explicit control over persistence */}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-gray-50 transition-colors"
            >
              {savedFeedback ? (
                <>
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Board
                </>
              )}
            </button>
          </div>

          {images.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No images uploaded yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <figure key={image.id} className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white">
                  {/* Click the image to open the full-size lightbox */}
                  <button
                    type="button"
                    onClick={() => setLightboxImage(image)}
                    className="w-full block focus:outline-none"
                    aria-label={`View ${image.name} full size`}
                  >
                    {/* Full image shown without cropping — aspect-ratio auto so
                        tall/wide images display completely */}
                    <img
                      src={image.src}
                      alt={image.name}
                      className="w-full object-contain max-h-80 bg-gray-50"
                    />
                  </button>
                  <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-[var(--text-muted)]">
                    <span className="truncate">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((item) => item.id !== image.id))}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-300 transition-colors"
                      title="Delete image"
                      aria-label="Delete image"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Lightbox — full-screen image viewer ──────────────────────────────── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white text-sm hover:underline"
              aria-label="Close lightbox"
            >
              Close ✕
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.name}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
            <p className="mt-2 text-center text-sm text-white/70">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
