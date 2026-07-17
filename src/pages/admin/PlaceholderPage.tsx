import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  phase?: string;
  icon?: string;
}

/**
 * Honest placeholder for admin sections delivered in later build phases. Shows a
 * clear "coming soon" state rather than a non-functional UI. Replaced by the real
 * feature as each phase lands.
 */
export function PlaceholderPage({ title, description, phase, icon = 'bi-tools' }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="at-card p-5">
        <EmptyState
          icon={icon}
          title={`${title} is on the way`}
          description={
            phase
              ? `This module is scheduled for ${phase} of the build and will connect to your live data.`
              : 'This module will connect to your live data as the build progresses.'
          }
        />
      </div>
    </div>
  );
}
