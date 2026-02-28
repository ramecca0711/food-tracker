import FeaturePage from '@/app/components/FeaturePage';

export default function ConnectionFoodSharingPage() {
  return (
    <FeaturePage
      section="Connection"
      title="Food Sharing"
      description="Plan shared meals, recipe swaps, and hosting ideas so nutrition and connection reinforce each other."
      focusItems={[
        'Upcoming shared meal ideas',
        'People to invite and preferences',
        'Recipe links and shopping notes',
      ]}
      nextActions={[
        'Pick one date for a shared meal.',
        'Choose the menu and assign prep tasks.',
        'Add a follow-up note after the meal.',
      ]}
    />
  );
}
