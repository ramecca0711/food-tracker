'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';
import { useAuth } from '@/app/components/AuthProvider';

type RingLevel = 1 | 2 | 3 | 4;
type CirclePerson = { id: string; name: string; ring: RingLevel; notes: string; angle: number };

// Sizes of the visual rings in the SVG/CSS layout — maps ring number to a pixel radius.
const ringRadii: Record<RingLevel, number> = { 1: 52, 2: 104, 3: 158, 4: 210 };

// Ring label text for each ring level.
const ringLabels: Record<RingLevel, string> = {
  1: 'Ring 1 (closest)',
  2: 'Ring 2',
  3: 'Ring 3',
  4: 'Ring 4',
};

export default function ConnectionMyCirclePage() {
  const { userId, isReady } = useAuth();
  const [people, setPeople] = useState<CirclePerson[]>([]);
  // Bulk name entry — "Who is in your life" comma-separated input.
  const [nameInput, setNameInput] = useState('');
  // Tiles generated from the name input waiting to be categorised into rings.
  const [pendingPeople, setPendingPeople] = useState<{ name: string; ring: RingLevel }[]>([]);

  // Touch-drag state for moving people between rings on mobile.
  const touchDragRef = useRef<{ personId: string; ghost: HTMLElement | null } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-person expanded notes state in the "All People" list.
  const [expandedPeopleIds, setExpandedPeopleIds] = useState<Set<string>>(new Set());
  // Per-person inline-edit state.
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValues, setInlineEditValues] = useState<Partial<CirclePerson>>({});

  // Desktop drag state.
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const storageKey = useMemo(() => `my-circle:${userId ?? 'guest'}`, [userId]);

  // ── Persistence ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isReady) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CirclePerson[];
      if (Array.isArray(parsed)) setPeople(parsed);
    } catch {
      setPeople([]);
    }
  }, [isReady, storageKey]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(storageKey, JSON.stringify(people));
  }, [isReady, people, storageKey]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Assign an angle to a new person based on how many others are already in that ring. */
  const nextAngle = (ring: RingLevel, currentPeople: CirclePerson[]) => {
    const sameRing = currentPeople.filter((p) => p.ring === ring).length;
    return sameRing * 55;
  };

  // ── Bulk name submission ──────────────────────────────────────────────────────

  /** Parse the comma-separated name input into pending tiles for categorisation. */
  const handleNameSubmit = () => {
    const names = nameInput
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setPendingPeople(names.map((name) => ({ name, ring: 2 as RingLevel })));
    setNameInput('');
  };

  /** Accept all pending people and add them to the circle. */
  const confirmPendingPeople = () => {
    setPeople((prev) => {
      let updated = [...prev];
      pendingPeople.forEach(({ name, ring }) => {
        updated.push({
          id: crypto.randomUUID(),
          name,
          ring,
          notes: '',
          angle: nextAngle(ring, updated),
        });
      });
      return updated;
    });
    setPendingPeople([]);
  };

  // ── Person mutations ──────────────────────────────────────────────────────────

  const updatePerson = (personId: string, updates: Partial<CirclePerson>) => {
    setPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, ...updates } : p)));
  };

  const movePersonToRing = (personId: string, ring: RingLevel) => {
    setPeople((prev) => {
      const sameRingCount = prev.filter((p) => p.ring === ring && p.id !== personId).length;
      return prev.map((p) =>
        p.id === personId ? { ...p, ring, angle: sameRingCount * 55 } : p
      );
    });
  };

  const deletePerson = (personId: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    if (inlineEditId === personId) setInlineEditId(null);
  };

  // ── Desktop drag (circle SVG overlay) ────────────────────────────────────────

  const getRingFromDropPoint = (x: number, y: number, rect: DOMRect): RingLevel => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);
    return ([1, 2, 3, 4] as RingLevel[]).reduce((closest, ring) =>
      Math.abs(ringRadii[ring] - distance) < Math.abs(ringRadii[closest] - distance)
        ? ring
        : closest
    );
  };

  // ── Touch drag (long-press on a person pill) ──────────────────────────────────

  const createGhost = (el: HTMLElement, x: number, y: number) => {
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.cssText = `position:fixed;width:${el.offsetWidth}px;opacity:.75;pointer-events:none;z-index:9999;left:${x - el.offsetWidth / 2}px;top:${y - 20}px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.3);`;
    document.body.appendChild(ghost);
    return ghost;
  };

  const handleTouchStart = (e: React.TouchEvent, personId: string, el: HTMLElement) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    longPressTimer.current = setTimeout(() => {
      touchDragRef.current = {
        personId,
        ghost: createGhost(el, startX, startY),
      };
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimer.current && !touchDragRef.current) {
      // Cancel long press if finger moved substantially.
      const touch = e.touches[0];
      if (touchDragRef.current === null) {
        // Still in long-press countdown — check movement.
      }
    }
    if (!touchDragRef.current?.ghost) return;
    e.preventDefault();
    const touch = e.touches[0];
    const ghost = touchDragRef.current.ghost;
    ghost.style.left = `${touch.clientX - parseInt(ghost.style.width) / 2}px`;
    ghost.style.top = `${touch.clientY - 20}px`;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const drag = touchDragRef.current;
    if (!drag?.ghost) { touchDragRef.current = null; return; }
    drag.ghost.remove();
    const touch = e.changedTouches[0];
    // Find the ring drop zone under the finger.
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    let target: Element | null = el;
    while (target && !target.getAttribute('data-ring')) target = target.parentElement;
    const toRing = target?.getAttribute('data-ring');
    if (toRing) movePersonToRing(drag.personId, parseInt(toRing) as RingLevel);
    touchDragRef.current = null;
  };

  // ── Inline edit ───────────────────────────────────────────────────────────────

  const startInlineEdit = (person: CirclePerson) => {
    setInlineEditId(person.id);
    setInlineEditValues({ name: person.name, ring: person.ring, notes: person.notes });
  };

  const saveInlineEdit = (personId: string) => {
    updatePerson(personId, inlineEditValues);
    if (inlineEditValues.ring !== undefined) {
      movePersonToRing(personId, inlineEditValues.ring as RingLevel);
    }
    setInlineEditId(null);
  };

  // ── Loading guard ─────────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <PageLayout>
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm text-[var(--text-muted)]">
          Loading...
        </div>
      </PageLayout>
    );
  }

  // Visual circle size — use a compact fixed size so the diagram fits on mobile.
  const CIRCLE_SIZE = 240; // half-dimension, total = 480px but we scale via CSS

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Connection</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">My Circle</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Map the people in your life by closeness ring. Hold on mobile to drag people between rings.
          </p>
        </header>

        {/* ── Circle diagram — shown at top of page ─────────────────────────── */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          {/* Circle diagram — scales to fit the screen width on mobile */}
          <div
            className="relative mx-auto overflow-visible"
            style={{ width: '100%', maxWidth: 480, aspectRatio: '1' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!draggingId) return;
              const ring = getRingFromDropPoint(
                e.clientX,
                e.clientY,
                e.currentTarget.getBoundingClientRect()
              );
              movePersonToRing(draggingId, ring);
              setDraggingId(null);
            }}
          >
            {/* Concentric ring outlines — rendered as a fraction of the container */}
            {([4, 3, 2, 1] as RingLevel[]).map((ring) => {
              const pct = (ringRadii[ring] / CIRCLE_SIZE) * 100;
              return (
                <div
                  key={ring}
                  // data-ring lets the touch-drop handler identify which ring the finger lifted on.
                  data-ring={ring}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-soft)]"
                  style={{ width: `${pct}%`, paddingBottom: `${pct}%` }}
                />
              );
            })}

            {/* Center "You" badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)] z-10">
              You
            </div>

            {/* Person pills positioned around the rings */}
            {people.map((person) => {
              const radius = (ringRadii[person.ring] / CIRCLE_SIZE) * 50; // as % of container half-width
              const x = Math.cos((person.angle * Math.PI) / 180) * radius;
              const y = Math.sin((person.angle * Math.PI) / 180) * radius;
              return (
                <button
                  key={person.id}
                  draggable
                  onDragStart={() => setDraggingId(person.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onTouchStart={(e) =>
                    handleTouchStart(e, person.id, e.currentTarget)
                  }
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  type="button"
                  onClick={() =>
                    setExpandedPeopleIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(person.id)) next.delete(person.id);
                      else next.add(person.id);
                      return next;
                    })
                  }
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-soft)] bg-white px-2 py-1 text-[11px] z-10 shadow-sm hover:shadow-md transition-shadow select-none touch-none"
                  style={{
                    left: `${50 + x}%`,
                    top: `${50 + y}%`,
                  }}
                >
                  {person.name}
                </button>
              );
            })}
          </div>

          {/* Ring drop zones for easy touch/drag target on mobile */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {([1, 2, 3, 4] as RingLevel[]).map((ring) => (
              <div
                key={ring}
                data-ring={ring}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) { movePersonToRing(draggingId, ring); setDraggingId(null); }
                }}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--text-muted)]"
              >
                Drop → Ring {ring}
              </div>
            ))}
          </div>
        </section>

        {/* ── "Who is in your life" bulk-add input ──────────────────────────── */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Who is in your life:</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Type names separated by commas, then hit Submit to get tiles you can assign to rings.
          </p>
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="e.g. Mom, Jake, Sara, Dr. Lee"
              className="flex-1 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleNameSubmit}
              className="rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-white"
            >
              Submit
            </button>
          </div>

          {/* Pending tiles — user assigns each to a ring before confirming */}
          {pendingPeople.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[var(--text-muted)] font-medium">Assign each person to a ring:</p>
              {pendingPeople.map((pending, idx) => (
                <div key={`${pending.name}-${idx}`} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--text-primary)] w-32 truncate">
                    {pending.name}
                  </span>
                  <select
                    value={pending.ring}
                    onChange={(e) => {
                      const ring = parseInt(e.target.value) as RingLevel;
                      setPendingPeople((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, ring } : p))
                      );
                    }}
                    className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm"
                  >
                    {([1, 2, 3, 4] as RingLevel[]).map((r) => (
                      <option key={r} value={r}>{ringLabels[r]}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={confirmPendingPeople}
                className="mt-2 rounded-lg bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-white"
              >
                Add to Circle
              </button>
            </div>
          )}
        </section>

        {/* ── All People — expandable cards with inline edit ────────────────── */}
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">All People</h2>
          {people.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No people added yet.</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => {
                const isExpanded = expandedPeopleIds.has(person.id);
                const isInlineEditing = inlineEditId === person.id;

                return (
                  <div
                    key={person.id}
                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-1)] overflow-hidden"
                  >
                    {/* Card header — click to expand/collapse notes */}
                    <div
                      className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/50 transition-colors"
                      onClick={() => {
                        if (isInlineEditing) return; // don't toggle while editing
                        setExpandedPeopleIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(person.id)) next.delete(person.id);
                          else next.add(person.id);
                          return next;
                        });
                      }}
                    >
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {person.name}
                        </span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">· Ring {person.ring}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Edit button — opens inline edit within the card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInlineEditing) {
                              saveInlineEdit(person.id);
                            } else {
                              startInlineEdit(person);
                              setExpandedPeopleIds((prev) => new Set([...prev, person.id]));
                            }
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)] hover:text-[var(--accent-strong)] transition-colors"
                          title={isInlineEditing ? 'Done editing' : 'Edit person'}
                          aria-label={isInlineEditing ? 'Done editing' : 'Edit person'}
                        >
                          {isInlineEditing ? (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l7.768-7.768a2.5 2.5 0 113.536 3.536L12.536 14.536a2 2 0 01-.878.517L8 16l.947-3.658A2 2 0 019.464 11.464z" />
                            </svg>
                          )}
                        </button>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deletePerson(person.id); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)] hover:text-red-500 transition-colors"
                          title="Delete person"
                          aria-label="Delete person"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                          </svg>
                        </button>
                        {/* Expand chevron */}
                        <svg
                          className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expandable body — shows notes (or inline edit form) */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-[var(--border-soft)] bg-white">
                        {isInlineEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Name</label>
                              <input
                                value={inlineEditValues.name ?? person.name}
                                onChange={(e) =>
                                  setInlineEditValues((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Ring</label>
                              <select
                                value={inlineEditValues.ring ?? person.ring}
                                onChange={(e) =>
                                  setInlineEditValues((prev) => ({
                                    ...prev,
                                    ring: parseInt(e.target.value) as RingLevel,
                                  }))
                                }
                                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm"
                              >
                                {([1, 2, 3, 4] as RingLevel[]).map((r) => (
                                  <option key={r} value={r}>{ringLabels[r]}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Notes</label>
                              <textarea
                                value={inlineEditValues.notes ?? person.notes}
                                onChange={(e) =>
                                  setInlineEditValues((prev) => ({ ...prev, notes: e.target.value }))
                                }
                                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-sm"
                                rows={3}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(person.id)}
                              className="rounded-lg bg-[var(--accent-strong)] px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                            {person.notes || <span className="italic">No notes yet. Click edit to add.</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
