import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthJournalPage() {
  return (
    <FeaturePage
      section="Growth"
      title="Journal"
      description="Use daily prompts to reflect on wins, friction points, and adjustments so momentum compounds over time."
      focusItems={[
        'Daily highlight and biggest challenge',
        'Patterns in mood, energy, and focus',
        'What to change tomorrow',
      ]}
      nextActions={[
        'Write a 3-line entry for today.',
        'Name one thing to stop and one to continue.',
        'Set tomorrow\'s first priority now.',
      ]}
    />
  );
}
