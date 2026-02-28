import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthBingoPage() {
  return (
    <FeaturePage
      section="Growth"
      title="Bingo"
      description="Create a fun accountability board of growth actions you want to complete each week and track streaks."
      focusItems={[
        'Weekly challenge tiles',
        'Daily habit checkoffs',
        'Reward rules for completed lines',
      ]}
      nextActions={[
        'Set 9-16 challenge tiles for this week.',
        'Choose one reward for a completed line.',
        'Mark progress at the end of each day.',
      ]}
    />
  );
}
