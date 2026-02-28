import FeaturePage from '@/app/components/FeaturePage';

export default function ConnectionInstagramTemplatesPage() {
  return (
    <FeaturePage
      section="Connection"
      title="Story Templates"
      description="Draft reusable story formats for food, progress, and accountability posts that are quick to publish."
      focusItems={[
        'Template categories and prompts',
        'Post cadence and content themes',
        'Links to assets and captions',
      ]}
      nextActions={[
        'Draft 3 repeatable story template formats.',
        'Add a short caption formula for each.',
        'Schedule one post for this week.',
      ]}
    />
  );
}
