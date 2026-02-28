import FeaturePage from '@/app/components/FeaturePage';

export default function BodyDashboardPage() {
  return (
    <FeaturePage
      section="WellBeing / Body"
      title="Body Dashboard"
      description="Use this page to keep a simple weekly view of body metrics, recovery, and training consistency so progress stays visible."
      focusItems={[
        'Body weight and trend direction',
        'Sleep quality and recovery score',
        'Weekly training and movement totals',
      ]}
      nextActions={[
        'Log today\'s bodyweight and sleep rating.',
        'Add one recovery habit for the week.',
        'Review progress photos every Sunday.',
      ]}
    />
  );
}
