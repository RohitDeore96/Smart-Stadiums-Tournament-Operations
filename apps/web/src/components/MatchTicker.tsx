/**
 * @file apps/web/src/components/MatchTicker.tsx
 * @description Live match countdown ticker — shows time until kickoff
 *   or "LIVE" with simulated score. Updates every second.
 *
 *   Challenge area: Real-time Decision Support
 */

import { type FC, useState, useEffect } from 'react';

interface MatchTickerProps {
  homeTeam: string;
  awayTeam: string;
  kickoffTimeUTC: string;
}

export const MatchTicker: FC<MatchTickerProps> = ({ homeTeam, awayTeam, kickoffTimeUTC }) => {
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState({ home: 0, away: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Simulate score updates if match is live
  useEffect(() => {
    const kickoff = new Date(kickoffTimeUTC).getTime();
    if (now < kickoff) return;

    const interval = setInterval(() => {
      setScore((prev) => {
        if (Math.random() < 0.15) {
          return Math.random() < 0.5
            ? { ...prev, home: prev.home + 1 }
            : { ...prev, away: prev.away + 1 };
        }
        return prev;
      });
    }, 45_000); // simulate a goal attempt every 45 seconds

    return () => {
      clearInterval(interval);
    };
  }, [kickoffTimeUTC, now]);

  const kickoff = new Date(kickoffTimeUTC).getTime();
  const diff = kickoff - now;
  const isLive = diff <= 0;

  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours)}h ${String(minutes)}m ${String(seconds)}s`;
  };

  return (
    <div
      className={`match-ticker ${isLive ? 'match-ticker--live' : ''}`}
      role="timer"
      aria-label={`Match: ${homeTeam} vs ${awayTeam}, ${isLive ? 'live' : `kickoff in ${formatCountdown(diff)}`}`}
    >
      <div className="match-ticker-teams">
        <span className="match-team">{homeTeam}</span>
        {isLive ? (
          <span className="match-score" aria-live="polite">
            {String(score.home)} - {String(score.away)}
          </span>
        ) : (
          <span className="match-vs">vs</span>
        )}
        <span className="match-team">{awayTeam}</span>
      </div>
      {isLive ? (
        <span className="match-live-badge" aria-label="Match is live">
          <span className="live-dot" aria-hidden="true" />
          LIVE
        </span>
      ) : (
        <span className="match-countdown" aria-live="off">
          ⏱ {formatCountdown(diff)}
        </span>
      )}
    </div>
  );
};
