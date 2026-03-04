'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('food-sharing:user');
      const savedPosts = localStorage.getItem('food-sharing:posts');
      if (savedUser) setCurrentUser(savedUser);
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts) as MealPost[];
        if (Array.isArray(parsed)) setPosts(parsed);
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('food-sharing:user', currentUser);
    localStorage.setItem('food-sharing:posts', JSON.stringify(posts));
  }, [currentUser, posts]);

  const activePost = useMemo(
    () => posts.find((post) => post.id === activeRequestPostId) || null,
    [posts, activeRequestPostId]
  );

  const editingPost = useMemo(
    () => posts.find((post) => post.id === editingPostId) || null,
    [posts, editingPostId]
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

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    if (activeRequestPostId === postId) setActiveRequestPostId(null);
    if (editingPostId === postId) setEditingPostId(null);
  };

  const updatePost = (postId: string, updates: Partial<MealPost>) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...updates } : post)));
  };

  const deleteRequest = (postId: string, requestId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, requests: post.requests.filter((request) => request.id !== requestId) } : post
      )
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPostId(post.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                    title="Edit post"
                    aria-label="Edit post"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l7.768-7.768a2.5 2.5 0 113.536 3.536L12.536 14.536a2 2 0 01-.878.517L8 16l.947-3.658A2 2 0 019.464 11.464z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePost(post.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                    title="Delete post"
                    aria-label="Delete post"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRequestPostId(post.id)}
                    className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-xs"
                  >
                    Request Trade
                  </button>
                </div>
              </div>

              {post.requests.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.requests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-[var(--border-soft)] bg-white p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {request.requester} offers {request.offeredMeal} ({request.offeredServings} servings)
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteRequest(post.id, request.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                          title="Delete request"
                          aria-label="Delete request"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0l1 12h6l1-12M10 11v6M14 11v6" />
                          </svg>
                        </button>
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

        {editingPost && (
          <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit Post</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              <input
                value={editingPost.mealName}
                onChange={(e) => updatePost(editingPost.id, { mealName: e.target.value })}
                placeholder="Meal name"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="1"
                value={String(editingPost.servingsAvailable)}
                onChange={(e) => updatePost(editingPost.id, { servingsAvailable: Number(e.target.value) || 1 })}
                placeholder="Servings"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
              <input
                value={editingPost.location}
                onChange={(e) => updatePost(editingPost.id, { location: e.target.value })}
                placeholder="Area"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingPostId(null)}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm"
              >
                Done
              </button>
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
