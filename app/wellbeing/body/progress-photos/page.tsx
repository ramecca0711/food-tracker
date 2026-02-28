'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { useAuth } from '@/app/components/AuthProvider';

type Angle = 'front' | 'back' | 'left' | 'right';

type EntryPhotos = Record<Angle, string | null>;

type ProgressPhotoEntry = {
  id: string;
  date: string;
  notes: string;
  photos: EntryPhotos;
  createdAt: string;
};

const ANGLES: Array<{ key: Angle; label: string }> = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

const emptyPhotos = (): EntryPhotos => ({
  front: null,
  back: null,
  left: null,
  right: null,
});

const formatDate = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const sortEntriesDesc = (entries: ProgressPhotoEntry[]) =>
  [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function ProgressPhotosPage() {
  const { userId, isReady } = useAuth();
  const [entries, setEntries] = useState<ProgressPhotoEntry[]>([]);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [draftPhotos, setDraftPhotos] = useState<EntryPhotos>(emptyPhotos);
  const [selectedCompareA, setSelectedCompareA] = useState<string>('');
  const [selectedCompareB, setSelectedCompareB] = useState<string>('');
  const [selectedAngle, setSelectedAngle] = useState<Angle>('front');

  const storageKey = useMemo(() => `progress-photos:${userId ?? 'guest'}`, [userId]);

  useEffect(() => {
    if (!isReady || !userId) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setEntries([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as ProgressPhotoEntry[];
      const sorted = sortEntriesDesc(parsed);
      setEntries(sorted);
      setSelectedCompareA(sorted[0]?.id ?? '');
      setSelectedCompareB(sorted[1]?.id ?? sorted[0]?.id ?? '');
    } catch {
      setEntries([]);
    }
  }, [isReady, storageKey, userId]);

  useEffect(() => {
    if (!isReady || !userId) return;
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, isReady, storageKey, userId]);

  const selectedEntryA = useMemo(
    () => entries.find((entry) => entry.id === selectedCompareA) ?? null,
    [entries, selectedCompareA]
  );

  const selectedEntryB = useMemo(
    () => entries.find((entry) => entry.id === selectedCompareB) ?? null,
    [entries, selectedCompareB]
  );

  const onUploadPhoto = async (angle: Angle, file: File | null) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Unable to read file'));
      reader.readAsDataURL(file);
    });

    setDraftPhotos((prev) => ({ ...prev, [angle]: dataUrl }));
  };

  const clearDraftAngle = (angle: Angle) => {
    setDraftPhotos((prev) => ({ ...prev, [angle]: null }));
  };

  const saveEntry = () => {
    const hasAtLeastOnePhoto = Object.values(draftPhotos).some(Boolean);
    if (!entryDate || !hasAtLeastOnePhoto) return;

    const existingForDate = entries.find((entry) => entry.date === entryDate);
    let nextEntries: ProgressPhotoEntry[];

    if (existingForDate) {
      nextEntries = entries.map((entry) =>
        entry.id === existingForDate.id
          ? {
              ...entry,
              notes: notes.trim(),
              photos: { ...draftPhotos },
            }
          : entry
      );
    } else {
      nextEntries = [
        ...entries,
        {
          id: `${entryDate}-${Date.now()}`,
          date: entryDate,
          notes: notes.trim(),
          photos: { ...draftPhotos },
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const sorted = sortEntriesDesc(nextEntries);
    setEntries(sorted);
    setSelectedCompareA(sorted[0]?.id ?? '');
    setSelectedCompareB(sorted[1]?.id ?? sorted[0]?.id ?? '');
    setNotes('');
    setDraftPhotos(emptyPhotos());
  };

  const deleteEntry = (entryId: string) => {
    const nextEntries = entries.filter((entry) => entry.id !== entryId);
    setEntries(nextEntries);
    if (selectedCompareA === entryId) {
      setSelectedCompareA(nextEntries[0]?.id ?? '');
    }
    if (selectedCompareB === entryId) {
      setSelectedCompareB(nextEntries[1]?.id ?? nextEntries[0]?.id ?? '');
    }
  };

  if (!isReady) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6 text-sm text-[var(--text-muted)]">
          Loading your session...
        </div>
      </PageLayout>
    );
  }

  if (!userId) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Progress Photos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Sign in to save and compare your progress photos.
          </p>
        </div>
      </PageLayout>
    );
  }

  const dates = entries.map((entry) => ({ id: entry.id, label: formatDate(entry.date) }));
  const hasDraftPhoto = Object.values(draftPhotos).some(Boolean);

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">WellBeing / Body</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Progress Photos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Log front, back, and side photos by date so you can compare changes over time.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add New Entry</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Entry Date</span>
              <input
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Notes (optional)</span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Energy, routine changes, or observations..."
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ANGLES.map((angle) => (
              <article key={angle.key} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{angle.label}</h3>
                  <button
                    type="button"
                    onClick={() => clearDraftAngle(angle.key)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Clear
                  </button>
                </div>
                <label className="block cursor-pointer rounded-lg border border-dashed border-[var(--border-soft)] p-3 text-center text-xs text-[var(--text-muted)] hover:border-[var(--accent-lavender)]">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onUploadPhoto(angle.key, event.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <div className="h-40 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)]">
                  {draftPhotos[angle.key] ? (
                    <img src={draftPhotos[angle.key] ?? ''} alt={`${angle.label} preview`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                      No photo yet
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={saveEntry}
            disabled={!entryDate || !hasDraftPhoto}
            className="rounded-xl bg-[var(--accent-strong)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Entry
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            If an entry already exists for this date, saving will update that date instead of creating a duplicate.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Compare Dates</h2>
            <div className="inline-flex rounded-lg border border-[var(--border-soft)] p-1">
              {ANGLES.map((angle) => (
                <button
                  key={angle.key}
                  type="button"
                  onClick={() => setSelectedAngle(angle.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    selectedAngle === angle.key
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>
          </div>

          {entries.length < 2 ? (
            <p className="text-sm text-[var(--text-muted)]">Add at least two entries to compare side by side.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Date A</span>
                  <select
                    value={selectedCompareA}
                    onChange={(event) => setSelectedCompareA(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {dates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Date B</span>
                  <select
                    value={selectedCompareB}
                    onChange={(event) => setSelectedCompareB(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {dates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[selectedEntryA, selectedEntryB].map((entry, index) => (
                  <article key={index} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {index === 0 ? 'Date A' : 'Date B'}: {entry ? formatDate(entry.date) : 'Not selected'}
                    </p>
                    <div className="mt-3 h-64 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)]">
                      {entry?.photos[selectedAngle] ? (
                        <img
                          src={entry.photos[selectedAngle] ?? ''}
                          alt={`${selectedAngle} comparison`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                          No {selectedAngle} photo on this date
                        </div>
                      )}
                    </div>
                    {entry?.notes ? (
                      <p className="mt-3 text-xs text-[var(--text-muted)]">Note: {entry.notes}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">History</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No entries yet. Add your first date above.</p>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{formatDate(entry.date)}</h3>
                      {entry.notes ? (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{entry.notes}</p>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">No notes</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Delete Entry
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {ANGLES.map((angle) => (
                      <div key={angle.key} className="space-y-1">
                        <p className="text-xs font-medium text-[var(--text-muted)]">{angle.label}</p>
                        <div className="h-28 overflow-hidden rounded-md border border-[var(--border-soft)] bg-[var(--surface-0)]">
                          {entry.photos[angle.key] ? (
                            <img src={entry.photos[angle.key] ?? ''} alt={`${angle.label} ${entry.date}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-[var(--text-muted)]">
                              Missing
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
