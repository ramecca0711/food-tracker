'use client';

import { useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type VisionImage = { id: string; name: string; src: string };

export default function GrowthVisionBoardPage() {
  // Local image URLs are used for quick preview until storage is wired.
  const [images, setImages] = useState<VisionImage[]>([]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const nextImages = files.map((file) => ({ id: crypto.randomUUID(), name: file.name, src: URL.createObjectURL(file) }));
    setImages((prev) => [...nextImages, ...prev]);
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
                  <figcaption className="px-3 py-2 text-xs text-[var(--text-muted)]">{image.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
