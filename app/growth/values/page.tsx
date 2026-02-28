import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthValuesPage() {
  return (
    <FeaturePage
      section="Growth"
      title="Values"
      description="Capture your core values and keep them visible when making decisions about work, health, and relationships."
      focusItems={[
        'Top personal values and what they mean',
        'Behaviors that align with each value',
        'Recent decisions that matched or missed your values',
      ]}
      nextActions={[
        'Write your top 5 values in priority order.',
        'Define one action that proves each value this week.',
        'Review your list before planning tomorrow.',
      ]}
    />
  );
}
