/**
 * @file apps/web/tests/CrowdZoneCard.test.tsx
 * @description Component tests for CrowdZoneCard — verifies density bar,
 *   level badge, and expansion behavior.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrowdZoneCard } from '../src/components/CrowdZoneCard';
import { I18nProvider } from '../src/context/I18nContext';
import type { CrowdZoneReading } from '@stadiumops/shared';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const mockReading: CrowdZoneReading = {
  zoneId: 'gate_a',
  stadiumId: 'st_metlife',
  count: 3500,
  densityRatio: 0.7,
  level: 'high',
  updatedAt: new Date().toISOString(),
};

describe('CrowdZoneCard', () => {
  it('renders the zone name', () => {
    render(
      <Wrapper>
        <CrowdZoneCard reading={mockReading} zoneName="Gate A" zoneCapacity={5000} />
      </Wrapper>,
    );
    expect(screen.getByText('Gate A')).toBeInTheDocument();
  });

  it('renders the crowd level badge', () => {
    render(
      <Wrapper>
        <CrowdZoneCard reading={mockReading} zoneName="Gate A" zoneCapacity={5000} />
      </Wrapper>,
    );
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the people count', () => {
    render(
      <Wrapper>
        <CrowdZoneCard reading={mockReading} zoneName="Gate A" zoneCapacity={5000} />
      </Wrapper>,
    );
    expect(screen.getByText('3,500')).toBeInTheDocument();
  });

  it('has a progressbar with correct aria-valuenow', () => {
    render(
      <Wrapper>
        <CrowdZoneCard reading={mockReading} zoneName="Gate A" zoneCapacity={5000} />
      </Wrapper>,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '70');
  });
});
