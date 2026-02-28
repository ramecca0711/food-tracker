'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type Suggestion = { id: string; text: string; group: string };

const suggestions: Suggestion[] = [
  { id: 'a1', group: 'Confidence', text: 'I follow through on what I say I will do.' },
  { id: 'a2', group: 'Confidence', text: 'I can handle hard things with calm focus.' },
  { id: 'a3', group: 'Health', text: 'I fuel my body with choices that support my goals.' },
  { id: 'a4', group: 'Health', text: 'I move my body every day, even in small ways.' },
  { id: 'a5', group: 'Discipline', text: 'I make progress through consistent daily actions.' },
  { id: 'a6', group: 'Discipline', text: 'I protect my priorities with clear boundaries.' },
  { id: 'a7', group: 'Relationships', text: 'I communicate honestly and with respect.' },
  { id: 'a8', group: 'Relationships', text: 'I invest in the people who matter most.' },
];

export default function GrowthAffirmationsPage() {
  // "AI assist" is represented as a guided chat input for now.
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [myAffirmations, setMyAffirmations] = useState<string[]>([]);

  const groups = useMemo(() => ['All', ...new Set(suggestions.map((s) => s.group))], []);

  const filtered = useMemo(() => {
    return suggestions.filter((item) => {
      const matchesGroup = groupFilter === 'All' || item.group === groupFilter;
      const matchesSearch = item.text.toLowerCase().includes(search.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [groupFilter, search]);

  const addSuggestion = (text: string) => {
    setMyAffirmations((prev) => (prev.includes(text) ? prev : [text, ...prev]));
  };

  const submitChatPrompt = () => {
    if (!chatInput.trim()) return;
    setChatLog((prev) => [
      `You: ${chatInput.trim()}`,
      `AI (placeholder): Try affirmations focused on ${chatInput.trim().toLowerCase()} and select what feels believable.`,
      ...prev,
    ]);
    setChatInput('');
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Growth</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Affirmations</h1>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">My Affirmations</h2>
          {myAffirmations.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">No affirmations selected yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {myAffirmations.map((text) => (
                <div key={text} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">
                  <span>{text}</span>
                  <button
                    type="button"
                    onClick={() => setMyAffirmations((prev) => prev.filter((entry) => entry !== text))}
                    className="text-xs text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Suggestion Chat</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="What do you want help with?"
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submitChatPrompt}
              className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
            >
              Ask AI
            </button>
          </div>
          {chatLog.length > 0 && (
            <div className="mt-3 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-soft)] bg-white p-3 text-xs text-[var(--text-muted)]">
              {chatLog.map((line, i) => (
                <div key={`${line}-${i}`}>{line}</div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suggestions..."
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            >
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-4">
            {groups
              .filter((group) => group !== 'All')
              .map((group) => {
                const groupItems = filtered.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{group}</h3>
                    <div className="mt-2 space-y-2">
                      {groupItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm">
                          <span>{item.text}</span>
                          <button
                            type="button"
                            onClick={() => addSuggestion(item.text)}
                            className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
