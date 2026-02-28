import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthTodoPage() {
  return (
    <FeaturePage
      section="Growth"
      title="To Do"
      description="Keep your personal growth tasks simple: define priorities, break them into next actions, and close loops daily."
      focusItems={[
        'Top 3 priorities for today',
        'Tasks grouped by personal projects',
        'Carry-over items from yesterday',
      ]}
      nextActions={[
        'Pick your top 3 must-do tasks.',
        'Break each into a 15-minute first step.',
        'Clear or reschedule all overdue tasks.',
      ]}
    />
  );
}
