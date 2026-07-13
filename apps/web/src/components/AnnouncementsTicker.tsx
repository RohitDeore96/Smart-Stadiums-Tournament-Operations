/**
 * @file apps/web/src/components/AnnouncementsTicker.tsx
 * @description Scrolling announcements ticker — CSS marquee that cycles
 *   through operational announcements. Pauses on hover.
 *
 *   Challenge area: Operational Intelligence
 */

import { type FC } from 'react';

export interface Announcement {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'critical';
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  { id: 'ann_1', text: 'Gate A is now open for entry', severity: 'info' },
  { id: 'ann_2', text: 'Parking Lot P3 is full — please use Lot P4', severity: 'warning' },
  { id: 'ann_3', text: 'Halftime in 10 minutes', severity: 'info' },
  { id: 'ann_4', text: 'Concession special: 2-for-1 hot dogs at Food Court', severity: 'info' },
  {
    id: 'ann_5',
    text: 'Section 300 crowd density approaching capacity — use alternate routes',
    severity: 'warning',
  },
];

interface AnnouncementsTickerProps {
  announcements?: Announcement[];
}

export const AnnouncementsTicker: FC<AnnouncementsTickerProps> = ({
  announcements = DEFAULT_ANNOUNCEMENTS,
}) => {
  if (announcements.length === 0) return null;

  // Duplicate the list for seamless scroll loop
  const doubled = [...announcements, ...announcements];

  return (
    <div className="announcements-ticker" role="marquee" aria-label="Live announcements">
      <span className="announcements-label" aria-hidden="true">
        📢
      </span>
      <div className="announcements-track" aria-live="polite">
        {doubled.map((ann, idx) => (
          <span
            key={`${ann.id}-${String(idx)}`}
            className={`announcement-item announcement-item--${ann.severity}`}
            role="listitem"
          >
            <span className="announcement-severity-icon" aria-hidden="true">
              {ann.severity === 'critical' ? '🚨' : ann.severity === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            {ann.text}
          </span>
        ))}
      </div>
    </div>
  );
};
