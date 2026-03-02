'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { readLocalJson, writeLocalJson } from '@/lib/localPersistence';

type VisionImage = { id: string; name: string; src: string };
const VISION_BOARD_STORAGE_KEY = 'growth:vision-board:images';

export default function GrowthVisionBoardPage() {
  // Persist uploaded images in local storage until backend storage is wired.
  const [images, setImages] = useState<VisionImage[]>([]);

  useEffect(() => {
    setImages(readLocalJson<VisionImage[]>(VISION_BOARD_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    writeLocalJson(VISION_BOARD_STORAGE_KEY, images);
  }, [images]);

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
    setImages((prev) => [...nextImages, ...prev]);
    event.target.value = '';
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
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white">
            Upload Images
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          {images.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No images uploaded yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <figure key={image.id} className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white">
                  <img src={image.src} alt={image.name} className="h-48 w-full object-cover" />
                  <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-[var(--text-muted)]">
                    <span className="truncate">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((item) => item.id !== image.id))}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-soft)] text-[var(--text-muted)]"
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
    </PageLayout>
  );
}
