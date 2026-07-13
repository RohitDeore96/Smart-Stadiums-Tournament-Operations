/**
 * @file apps/web/src/components/StadiumMap.tsx
 * @description Interactive SVG stadium map with live crowd heatmap overlay.
 *
 *   Features:
 *   - 12 stadium zones rendered as SVG rectangles in a realistic layout
 *   - Color-coded by live crowd density (green/yellow/orange/red)
 *   - Clickable zones (highlights + shows details)
 *   - Pulsing animation on critical zones
 *   - Route highlighting when a zone is selected from chat
 *   - Legend below the map
 *
 *   Challenge areas: Navigation + Crowd Management
 */

import { type FC, useState, useEffect } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import { getCurrentStadium } from '../services/crowdService.js';
import { useI18n } from '../context/I18nContext.js';

interface StadiumMapProps {
  readings: CrowdZoneReading[];
  highlightedZoneId?: string | null;
  onZoneClick?: (zoneId: string) => void;
}

interface ZoneLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'gate' | 'section' | 'concourse' | 'food' | 'first_aid';
}

// Stadium layout: 800x500 SVG canvas
// Gates at top/bottom, sections in center, concourses on sides, food + first_aid scattered
const ZONE_LAYOUTS: ZoneLayout[] = [
  // Gates (top and bottom)
  { id: 'gate_a', name: 'Gate A', x: 150, y: 20, w: 100, h: 40, type: 'gate' },
  { id: 'gate_b', name: 'Gate B', x: 350, y: 20, w: 100, h: 40, type: 'gate' },
  { id: 'gate_c', name: 'Gate C', x: 550, y: 20, w: 100, h: 40, type: 'gate' },
  { id: 'gate_d', name: 'Gate D', x: 350, y: 440, w: 100, h: 40, type: 'gate' },
  // Sections (center — the bowl)
  { id: 'sec_100', name: 'Section 100', x: 120, y: 120, w: 120, h: 60, type: 'section' },
  { id: 'sec_200', name: 'Section 200', x: 280, y: 120, w: 120, h: 60, type: 'section' },
  { id: 'sec_300', name: 'Section 300', x: 440, y: 120, w: 120, h: 60, type: 'section' },
  { id: 'sec_400', name: 'Section 400', x: 600, y: 120, w: 120, h: 60, type: 'section' },
  // Concourses (left and right sides)
  { id: 'concourse_north', name: 'Concourse N', x: 60, y: 220, w: 80, h: 80, type: 'concourse' },
  { id: 'concourse_south', name: 'Concourse S', x: 680, y: 220, w: 80, h: 80, type: 'concourse' },
  // Food court (center bottom)
  { id: 'food_court', name: 'Food Court', x: 300, y: 320, w: 140, h: 60, type: 'food' },
  // First aid (near center)
  { id: 'first_aid', name: 'First Aid', x: 500, y: 320, w: 80, h: 60, type: 'first_aid' },
];

const LEVEL_COLORS: Record<string, string> = {
  low: '#4ade80',
  moderate: '#fbbf24',
  high: '#fb923c',
  critical: '#ef4444',
};

export const StadiumMap: FC<StadiumMapProps> = ({ readings, highlightedZoneId, onZoneClick }) => {
  const { t } = useI18n();
  const stadium = getCurrentStadium();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Sync external highlight with internal state
  useEffect(() => {
    if (highlightedZoneId) {
      setSelectedZone(highlightedZoneId);
    }
  }, [highlightedZoneId]);

  const handleZoneClick = (zoneId: string): void => {
    setSelectedZone(zoneId === selectedZone ? null : zoneId);
    onZoneClick?.(zoneId);
  };

  const getReading = (zoneId: string): CrowdZoneReading | undefined => {
    return readings.find((r) => r.zoneId === zoneId);
  };

  const getZoneColor = (zoneId: string): string => {
    const reading = getReading(zoneId);
    if (!reading) return '#2a3050'; // default dark
    return LEVEL_COLORS[reading.level] ?? '#2a3050';
  };

  const isHighlighted = (zoneId: string): boolean => {
    return selectedZone === zoneId || highlightedZoneId === zoneId;
  };

  const isCritical = (zoneId: string): boolean => {
    return getReading(zoneId)?.level === 'critical';
  };

  return (
    <section className="stadium-map-section" aria-label="Stadium map with crowd heatmap">
      <div className="stadium-map-header">
        <h3 className="section-title">{stadium.name}</h3>
        <p className="stadium-map-subtitle">
          {stadium.city}, {stadium.country} • Capacity {stadium.capacity.toLocaleString()}
        </p>
      </div>

      <div
        className="stadium-map-container"
        role="application"
        aria-label="Interactive stadium map"
      >
        <svg
          viewBox="0 0 800 500"
          className="stadium-map-svg"
          role="img"
          aria-label="Stadium layout showing 12 zones with live crowd density"
        >
          {/* Field (center) */}
          <rect
            x="280"
            y="200"
            width="240"
            height="100"
            rx="4"
            fill="#0d1117"
            stroke="#1f2540"
            strokeWidth="2"
          />
          <text
            x="400"
            y="255"
            textAnchor="middle"
            fill="#4a5568"
            fontSize="14"
            fontFamily="sans-serif"
          >
            FIELD
          </text>

          {/* Zones */}
          {ZONE_LAYOUTS.map((zone) => {
            const color = getZoneColor(zone.id);
            const highlighted = isHighlighted(zone.id);
            const critical = isCritical(zone.id);
            const reading = getReading(zone.id);

            return (
              <g
                key={zone.id}
                onClick={() => {
                  handleZoneClick(zone.id);
                }}
                className={`zone-group ${highlighted ? 'zone-group--highlighted' : ''} ${critical ? 'zone-group--critical' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${zone.name}, ${reading ? `${String(reading.count)} people, ${reading.level} density` : 'no data'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleZoneClick(zone.id);
                  }
                }}
              >
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx={6}
                  fill={color}
                  fillOpacity={highlighted ? 0.9 : 0.6}
                  stroke={highlighted ? '#00d4ff' : '#1f2540'}
                  strokeWidth={highlighted ? 3 : 1}
                  className="zone-rect"
                  style={{ transition: 'fill 0.5s ease, stroke 0.3s ease' }}
                />
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 + 4}
                  textAnchor="middle"
                  fill="#0a0e1a"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {zone.name}
                </text>
                {reading && (
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 16}
                    textAnchor="middle"
                    fill="#0a0e1a"
                    fontSize="9"
                    fontFamily="sans-serif"
                    opacity={0.8}
                    pointerEvents="none"
                  >
                    {reading.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="stadium-map-legend" role="list" aria-label="Crowd density legend">
        <span className="legend-item" role="listitem">
          <span className="legend-dot" style={{ backgroundColor: '#4ade80' }} aria-hidden="true" />
          {t('crowd.level.low')}
        </span>
        <span className="legend-item" role="listitem">
          <span className="legend-dot" style={{ backgroundColor: '#fbbf24' }} aria-hidden="true" />
          {t('crowd.level.moderate')}
        </span>
        <span className="legend-item" role="listitem">
          <span className="legend-dot" style={{ backgroundColor: '#fb923c' }} aria-hidden="true" />
          {t('crowd.level.high')}
        </span>
        <span className="legend-item" role="listitem">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} aria-hidden="true" />
          {t('crowd.level.critical')}
        </span>
      </div>

      {/* Selected zone details */}
      {selectedZone && (
        <div className="zone-detail-panel" role="status" aria-live="polite">
          {(() => {
            const zone = ZONE_LAYOUTS.find((z) => z.id === selectedZone);
            const reading = getReading(selectedZone);
            if (!zone) return null;
            return (
              <>
                <h4 className="zone-detail-title">{zone.name}</h4>
                {reading ? (
                  <dl className="zone-detail-stats">
                    <dt>{t('crowd.count')}</dt>
                    <dd>{reading.count.toLocaleString()}</dd>
                    <dt>{t('crowd.level')}</dt>
                    <dd>{t(`crowd.level.${reading.level}`)}</dd>
                    <dt>{t('crowd.updated')}</dt>
                    <dd>{new Date(reading.updatedAt).toLocaleTimeString()}</dd>
                  </dl>
                ) : (
                  <p className="zone-detail-empty">No data available</p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
};
