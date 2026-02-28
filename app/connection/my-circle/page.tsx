import FeaturePage from '@/app/components/FeaturePage';

export default function ConnectionMyCirclePage() {
  return (
    <FeaturePage
      section="Connection"
      title="My Circle"
      description="Track your key relationships and outreach rhythm so important people do not fall through the cracks."
      focusItems={[
        'Close contacts and relationship notes',
        'Last check-in date and next touchpoint',
        'Shared goals and support opportunities',
      ]}
      nextActions={[
        'List the 10 people you want to stay close with.',
        'Set next check-in dates for each person.',
        'Send one meaningful message today.',
      ]}
    />
  );
}
