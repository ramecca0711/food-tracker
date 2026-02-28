import FeaturePage from '@/app/components/FeaturePage';

export default function TrainingPlanPage() {
  return (
    <FeaturePage
      section="WellBeing / Body"
      title="Training Plan"
      description="Plan your week of workouts with a clear split, priority lifts, and progression notes so training decisions are consistent."
      focusItems={[
        'Weekly split and session schedule',
        'Main lifts, accessories, and rep targets',
        'Progressive overload notes and deload timing',
      ]}
      nextActions={[
        'Set your 3-5 training days for this week.',
        'Choose one focus lift for each session.',
        'Record your top set and back-off set targets.',
      ]}
    />
  );
}
