'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type TradeRequest = {
  id: string;
  requester: string;
  offeredMeal: string;
  offeredServings: number;
  timeOptions: string[];
  status: 'pending' | 'confirmed';
  selectedTime?: string;
};

type MealPost = {
  id: string;
  poster: string;
  mealName: string;
  servingsAvailable: number;
  location: string;
  requests: TradeRequest[];
};

export default function ConnectionFoodSharingPage() {
  // Trade requests include offered meal, servings, and candidate meet times.
  const [currentUser, setCurrentUser] = useState('You');
  const [posts, setPosts] = useState<MealPost[]>([
    {
      id: 'p1',
      poster: 'You',
      mealName: 'Turkey chili',
      servingsAvailable: 3,
      location: 'Downtown',
      requests: [],
    },
    {
      id: 'p2',
      poster: 'Jamie',
      mealName: 'Veggie pasta bake',
      servingsAvailable: 2,
      location: 'West Side',
      requests: [],
    },
  ]);

  const [newPost, setNewPost] = useState({ mealName: '', servings: '1', location: '' });
  const [activeRequestPostId, setActiveRequestPostId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ offeredMeal: '', offeredServings: '1', timesCsv: '' });

  const activePost = useMemo(
    () => posts.find((post) => post.id === activeRequestPostId) || null,
    [posts, activeRequestPostId]
  );

  const addPost = () => {
    const mealName = newPost.mealName.trim();
    const servings = Number(newPost.servings);
    if (!mealName || !Number.isFinite(servings) || servings <= 0) return;

    setPosts((prev) => [
      {
        id: crypto.randomUUID(),
        poster: currentUser,
        mealName,
        servingsAvailable: servings,
        location: newPost.location.trim() || 'TBD',
        requests: [],
      },
      ...prev,
    ]);
    setNewPost({ mealName: '', servings: '1', location: '' });
  };

  const submitTradeRequest = () => {
    if (!activePost) return;
    const offeredMeal = requestForm.offeredMeal.trim();
    const offeredServings = Number(requestForm.offeredServings);
    const times = requestForm.timesCsv
      .split(',')
      .map((time) => time.trim())
      .filter(Boolean);

    if (!offeredMeal || !Number.isFinite(offeredServings) || offeredServings <= 0 || times.length === 0) return;

    const nextRequest: TradeRequest = {
      id: crypto.randomUUID(),
      requester: currentUser,
      offeredMeal,
      offeredServings,
      timeOptions: times,
      status: 'pending',
    };

    setPosts((prev) =>
      prev.map((post) => (post.id === activePost.id ? { ...post, requests: [nextRequest, ...post.requests] } : post))
    );

    setActiveRequestPostId(null);
    setRequestForm({ offeredMeal: '', offeredServings: '1', timesCsv: '' });
  };

  const confirmRequest = (postId: string, requestId: string, selectedTime: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          requests: post.requests.map((request) =>
            request.id === requestId ? { ...request, status: 'confirmed', selectedTime } : request
          ),
        };
      })
    );
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Connection</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Food Sharing</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Post leftovers, request swaps, and confirm the best meeting time.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <label className="text-sm text-[var(--text-muted)]">Viewing as</label>
            <input
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value || 'You')}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Post a Meal</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              value={newPost.mealName}
              onChange={(e) => setNewPost((prev) => ({ ...prev, mealName: e.target.value }))}
              placeholder="I made..."
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="1"
              value={newPost.servings}
              onChange={(e) => setNewPost((prev) => ({ ...prev, servings: e.target.value }))}
              placeholder="Servings"
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <input
              value={newPost.location}
              onChange={(e) => setNewPost((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Area"
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
            />
            <button type="button" onClick={addPost} className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white">
              Post
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{post.mealName}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {post.poster} · {post.servingsAvailable} servings · {post.location}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRequestPostId(post.id)}
                  className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-xs"
                >
                  Request Trade
                </button>
              </div>

              {post.requests.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.requests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-[var(--border-soft)] bg-white p-2 text-xs">
                      <div>
                        {request.requester} offers {request.offeredMeal} ({request.offeredServings} servings)
                      </div>
                      <div className="mt-1 text-[var(--text-muted)]">Times: {request.timeOptions.join(' | ')}</div>
                      <div className="mt-1 text-[var(--text-muted)]">Status: {request.status}</div>

                      {post.poster === currentUser && request.status === 'pending' && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {request.timeOptions.map((time) => (
                            <button
                              key={`${request.id}-${time}`}
                              type="button"
                              onClick={() => confirmRequest(post.id, request.id, time)}
                              className="rounded border border-[var(--border-soft)] bg-white px-2 py-1"
                            >
                              Confirm {time}
                            </button>
                          ))}
                        </div>
                      )}

                      {request.status === 'confirmed' && request.selectedTime && (
                        <div className="mt-1 font-medium text-green-700">Confirmed for: {request.selectedTime}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        {activePost && (
          <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Request Trade for: {activePost.mealName}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                value={requestForm.offeredMeal}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, offeredMeal: e.target.value }))}
                placeholder="Your meal to offer"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="1"
                value={requestForm.offeredServings}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, offeredServings: e.target.value }))}
                placeholder="Servings"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
              <input
                value={requestForm.timesCsv}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, timesCsv: e.target.value }))}
                placeholder="Good times (comma separated)"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={submitTradeRequest}
                className="rounded-lg bg-[var(--accent-strong)] px-3 py-2 text-sm font-medium text-white"
              >
                Send Request
              </button>
              <button
                type="button"
                onClick={() => setActiveRequestPostId(null)}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
