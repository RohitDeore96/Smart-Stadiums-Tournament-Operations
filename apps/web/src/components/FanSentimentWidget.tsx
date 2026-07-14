/**
 * @file apps/web/src/components/FanSentimentWidget.tsx
 * @description Live fan sentiment poll widget — fans vote on their experience
 *   and see a live bar chart. Simulates other fans voting every 3 seconds.
 *
 *   Challenge area: Real-time Decision Support
 */

import { type FC, useState, useEffect } from 'react';

type Sentiment = 'happy' | 'neutral' | 'sad';

interface VoteCounts {
  happy: number;
  neutral: number;
  sad: number;
}

const SENTIMENT_ICONS: Record<Sentiment, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😟',
};

export const FanSentimentWidget: FC = () => {
  const [votes, setVotes] = useState<VoteCounts>({ happy: 12, neutral: 5, sad: 2 });
  const [userVoted, setUserVoted] = useState<Sentiment | null>(null);

  // Simulate other fans voting every 3 seconds (capped at 1000 total)
  useEffect(() => {
    const interval = setInterval(() => {
      setVotes((prev) => {
        const total = prev.happy + prev.neutral + prev.sad;
        if (total >= 1000) return prev; // Cap at 1000 to prevent unbounded growth
        const sentiments: Sentiment[] = ['happy', 'neutral', 'sad'];
        const random = sentiments[Math.floor(Math.random() * 3)] ?? 'happy';
        const increment = Math.floor(Math.random() * 4) + 1;
        return {
          ...prev,
          [random]: prev[random] + increment,
        };
      });
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleVote = (sentiment: Sentiment): void => {
    if (userVoted) return;
    setUserVoted(sentiment);
    setVotes((prev) => ({ ...prev, [sentiment]: prev[sentiment] + 1 }));
  };

  const total = votes.happy + votes.neutral + votes.sad;
  const percentages: Record<Sentiment, number> = {
    happy: total > 0 ? Math.round((votes.happy / total) * 100) : 0,
    neutral: total > 0 ? Math.round((votes.neutral / total) * 100) : 0,
    sad: total > 0 ? Math.round((votes.sad / total) * 100) : 0,
  };

  const dominant: Sentiment =
    votes.happy >= votes.neutral && votes.happy >= votes.sad
      ? 'happy'
      : votes.neutral >= votes.sad
        ? 'neutral'
        : 'sad';

  const sentiments: Sentiment[] = ['happy', 'neutral', 'sad'];

  return (
    <section className="sentiment-widget" aria-label="Fan sentiment poll">
      <h3 className="section-title">📊 Fan Sentiment</h3>
      <p className="sentiment-question">How's your experience? (Live simulated poll)</p>

      {!userVoted ? (
        <div className="sentiment-buttons" role="group" aria-label="Vote on your experience">
          {sentiments.map((s) => (
            <button
              key={s}
              type="button"
              className="sentiment-btn"
              onClick={() => {
                handleVote(s);
              }}
              aria-label={`Vote ${s}`}
            >
              <span aria-hidden="true" className="sentiment-icon">
                {SENTIMENT_ICONS[s]}
              </span>
              <span className="sentiment-label">{s}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="sentiment-voted" role="status" aria-live="polite">
          Thanks for voting! You voted {SENTIMENT_ICONS[userVoted]} {userVoted}.
        </p>
      )}

      {/* Live bar chart */}
      <div className="sentiment-chart" aria-label={`Live results: ${String(total)} votes`}>
        {sentiments.map((s) => (
          <div key={s} className="sentiment-bar-row">
            <span className="sentiment-bar-label" aria-hidden="true">
              {SENTIMENT_ICONS[s]} {s}
            </span>
            <div
              className="sentiment-bar-track"
              role="img"
              aria-label={`${s}: ${String(percentages[s])}%`}
            >
              <div
                className={`sentiment-bar-fill sentiment-bar-fill--${s}`}
                style={{ width: `${String(percentages[s])}%` }}
              />
            </div>
            <span className="sentiment-bar-percent">{String(percentages[s])}%</span>
          </div>
        ))}
      </div>

      <p className="sentiment-summary">
        <span aria-hidden="true">{SENTIMENT_ICONS[dominant]}</span>
        <span>
          {String(total)} fans • Dominant: <strong>{dominant}</strong>
        </span>
      </p>
    </section>
  );
};
