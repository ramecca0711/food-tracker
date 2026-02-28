import FeaturePage from '@/app/components/FeaturePage';

export default function GrowthVisionBoardPage() {
  return (
    <FeaturePage
      section="Growth"
      title="Vision Board"
      description="Define your near-term direction with clear themes, images, and outcome statements you can revisit often."
      focusItems={[
        '90-day vision themes',
        'Reference images and words',
        'Milestones that prove progress',
      ]}
      nextActions={[
        'Pick 3 focus themes for the next 90 days.',
        'Add one measurable milestone for each theme.',
        'Review and adjust your board weekly.',
      ]}
    />
  );
}
