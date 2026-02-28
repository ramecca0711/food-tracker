import FeaturePage from '@/app/components/FeaturePage';

export default function ReportsYearWrappedPage() {
  return (
    <FeaturePage
      section="Reports"
      title="Year Wrapped"
      description="Review annual trends across nutrition, training, and habits to understand what moved the needle most."
      focusItems={[
        'Yearly averages and biggest improvements',
        'Consistency streaks and missed periods',
        'Top lessons and next-year priorities',
      ]}
      nextActions={[
        'Summarize your top 3 wins from this year.',
        'Identify one pattern to stop next year.',
        'Set next year\'s baseline metrics.',
      ]}
    />
  );
}
