import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthAffirmationsPage() {
  return (
    <FeaturePage
      section="Growth"
      title="Affirmations"
      description="Build short, believable affirmations tied to current goals so your self-talk stays grounded and useful."
      focusItems={[
        'Identity-based affirmations for current goals',
        'Morning and evening repeat prompts',
        'Evidence list that supports each affirmation',
      ]}
      nextActions={[
        'Write 3 affirmations connected to active goals.',
        'Add one piece of evidence under each statement.',
        'Read them at the start and end of your day.',
      ]}
    />
  );
}
