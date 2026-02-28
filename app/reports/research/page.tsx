import FeaturePage from '@/app/components/FeaturePage';

export default function ReportsResearchPage() {
  return (
    <FeaturePage
      section="Reports"
      title="Research"
      description="Collect notes from articles, studies, and experiments so decisions are based on evidence you can revisit."
      focusItems={[
        'Study summaries and key findings',
        'Practical takeaways worth testing',
        'Personal experiment logs and outcomes',
      ]}
      nextActions={[
        'Capture one study summary this week.',
        'Define one behavior change to test.',
        'Record the result after 7 days.',
      ]}
    />
  );
}
