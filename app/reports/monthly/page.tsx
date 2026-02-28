import FeaturePage from '@/app/components/FeaturePage';

export default function ReportsMonthlyPage() {
  return (
    <FeaturePage
      section="Reports"
      title="Monthly"
      description="Use monthly summaries to review habits, nutrition outcomes, and execution quality before the next cycle starts."
      focusItems={[
        'Monthly averages and goal adherence',
        'Wins, misses, and causes',
        'Adjustments for next month',
      ]}
      nextActions={[
        'Review this month\'s best week and worst week.',
        'Write one adjustment per category.',
        'Set clear targets for next month.',
      ]}
    />
  );
}
