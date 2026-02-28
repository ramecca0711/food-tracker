import FeaturePage from '@/app/components/FeaturePage';

export default function ReportsIntegrationsPage() {
  return (
    <FeaturePage
      section="Reports"
      title="Integrations"
      description="Manage connected tools and data flows so your dashboards stay reliable and up to date."
      focusItems={[
        'Connected services and sync status',
        'Data source ownership and permissions',
        'Known sync gaps and troubleshooting notes',
      ]}
      nextActions={[
        'List current integrations and owners.',
        'Check latest sync timestamp for each source.',
        'Flag one reliability improvement to implement.',
      ]}
    />
  );
}
