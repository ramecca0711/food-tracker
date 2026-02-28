'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type JournalEntry = { id: string; text: string; createdAt: string };

export default function GrowthJournalPage() {
  // Voice input uses the browser speech recognition API when available.
  const [draft, setDraft] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isListening, setIsListening] = useState(false);

  const submitEntry = () => {
    if (!draft.trim()) return;
    setEntries((prev) => [{ id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString() }, ...prev]);
    setDraft('');
  };

  const startVoiceCapture = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not available in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setDraft((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const todayCount = useMemo(
    () => entries.filter((entry) => new Date(entry.createdAt).toDateString() === new Date().toDateString()).length,
    [entries]
  );

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Journal</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Free-form "Today I did..." entries. AI parsing/summaries will be added later.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Entry</h2>
            <span className="text-xs text-[var(--text-muted)]">Entries today: {todayCount}</span>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Today I did..."
            className="mt-3 w-full rounded-lg border border-[var(--border-soft)] bg-white p-3 text-sm"
            rows={7}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startVoiceCapture}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              {isListening ? 'Listening...' : 'Text to Speech'}
            </button>
            <button
              type="button"
              onClick={submitEntry}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
            >
              Submit Entry
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Entries</h2>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">No entries yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {entries.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-[var(--border-soft)] bg-white p-3">
                  <div className="text-xs text-[var(--text-muted)]">{new Date(entry.createdAt).toLocaleString()}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{entry.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
