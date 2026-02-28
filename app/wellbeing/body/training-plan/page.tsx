'use client';

import { useMemo, useState } from 'react';
import PageLayout from '@/app/components/PageLayout';

type Exercise = { id: string; name: string; sets: number; reps: string; weight: string };
type DayPlan = { id: string; label: string; exercises: Exercise[] };
type WeekPlan = { id: string; label: string; days: DayPlan[] };

const currentWeek: WeekPlan = {
  id: 'w-current',
  label: 'Current Week',
  days: [
    {
      id: 'd-mon',
      label: 'Monday',
      exercises: [
        { id: 'e-1', name: 'Back Squat', sets: 4, reps: '6', weight: '185 lb' },
        { id: 'e-2', name: 'Romanian Deadlift', sets: 3, reps: '8', weight: '155 lb' },
      ],
    },
    {
      id: 'd-wed',
      label: 'Wednesday',
      exercises: [
        { id: 'e-3', name: 'Bench Press', sets: 4, reps: '6', weight: '145 lb' },
      ],
    },
  ],
};

const previousWeek: WeekPlan = {
  id: 'w-prev',
  label: 'Previous Week',
  days: [
    {
      id: 'd-prev-fri',
      label: 'Friday',
      exercises: [{ id: 'e-4', name: 'Deadlift', sets: 3, reps: '5', weight: '225 lb' }],
    },
  ],
};

export default function TrainingPlanPage() {
  // Two collapsible sections: calendar and list view.
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [weeks, setWeeks] = useState<WeekPlan[]>([currentWeek, previousWeek]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set(['w-current']));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['d-mon']));
  const [selectedDayId, setSelectedDayId] = useState('d-mon');

  const daysFlat = useMemo(() => weeks.flatMap((w) => w.days), [weeks]);

  const updateExercise = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    field: keyof Exercise,
    value: string
  ) => {
    setWeeks((prev) =>
      prev.map((week) => {
        if (week.id !== weekId) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              exercises: day.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;
                if (field === 'sets') return { ...exercise, sets: Number(value) || 0 };
                return { ...exercise, [field]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const toggleSet = (setValue: Set<string>, id: string, setter: (next: Set<string>) => void) => {
    const next = new Set(setValue);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">WellBeing / Body</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Training Plan</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Calendar plus weekly list view. Weeks and days are collapsible, and exercise fields are editable.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <button
            type="button"
            onClick={() => setCalendarOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Calendar View</h2>
            <span className="text-xs text-[var(--text-muted)]">{calendarOpen ? 'Hide' : 'Show'}</span>
          </button>

          {calendarOpen && (
            <div className="mt-4 grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, idx) => {
                const day = daysFlat[idx];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => day && setSelectedDayId(day.id)}
                    className={`rounded-lg border px-2 py-3 text-left text-xs ${
                      day?.id === selectedDayId
                        ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                        : 'border-[var(--border-soft)] bg-white text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-semibold">{name}</div>
                    <div className="mt-1">{day ? `${day.exercises.length} exercises` : 'Rest'}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-5">
          <button
            type="button"
            onClick={() => setListOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">List View</h2>
            <span className="text-xs text-[var(--text-muted)]">{listOpen ? 'Hide' : 'Show'}</span>
          </button>

          {listOpen && (
            <div className="mt-4 space-y-3">
              {weeks.map((week) => (
                <div key={week.id} className="rounded-lg border border-[var(--border-soft)] bg-white p-3">
                  <button
                    type="button"
                    onClick={() => toggleSet(expandedWeeks, week.id, setExpandedWeeks)}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{week.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{expandedWeeks.has(week.id) ? 'Collapse' : 'Expand'}</span>
                  </button>

                  {expandedWeeks.has(week.id) && (
                    <div className="mt-3 space-y-2">
                      {week.days.map((day) => (
                        <div key={day.id} className="rounded-md border border-[var(--border-soft)] p-3">
                          <button
                            type="button"
                            onClick={() => toggleSet(expandedDays, day.id, setExpandedDays)}
                            className="flex w-full items-center justify-between"
                          >
                            <span className="text-sm font-medium text-[var(--text-primary)]">{day.label}</span>
                            <span className="text-xs text-[var(--text-muted)]">{expandedDays.has(day.id) ? 'Hide' : 'Show'}</span>
                          </button>

                          {expandedDays.has(day.id) && (
                            <div className="mt-3 space-y-2">
                              {day.exercises.map((exercise) => (
                                <div key={exercise.id} className="grid gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-0)] p-2 sm:grid-cols-4">
                                  <input
                                    value={exercise.name}
                                    onChange={(e) => updateExercise(week.id, day.id, exercise.id, 'name', e.target.value)}
                                    className="rounded border border-[var(--border-soft)] bg-white px-2 py-1 text-xs"
                                  />
                                  <input
                                    value={exercise.sets}
                                    onChange={(e) => updateExercise(week.id, day.id, exercise.id, 'sets', e.target.value)}
                                    className="rounded border border-[var(--border-soft)] bg-white px-2 py-1 text-xs"
                                  />
                                  <input
                                    value={exercise.reps}
                                    onChange={(e) => updateExercise(week.id, day.id, exercise.id, 'reps', e.target.value)}
                                    className="rounded border border-[var(--border-soft)] bg-white px-2 py-1 text-xs"
                                  />
                                  <input
                                    value={exercise.weight}
                                    onChange={(e) => updateExercise(week.id, day.id, exercise.id, 'weight', e.target.value)}
                                    className="rounded border border-[var(--border-soft)] bg-white px-2 py-1 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
