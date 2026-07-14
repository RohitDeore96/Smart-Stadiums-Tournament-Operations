/**
 * @file apps/web/src/components/FanSentimentWidget.tsx
 * @description Live fan sentiment widget powered by real Gemini sentiment
 *   analysis of recent incident descriptions. Fans can also vote on their
 *   own experience — votes are combined with AI-analyzed incident sentiment
 *   for a unified sentiment score.
 *
 *   Challenge area: Real-time Decision Support + GenAI Innovation
 */

import { type FC, useState, useEffect } from 'react';

type Sentiment = 'positive' | 'neutral' | 'negative';

interface VoteCounts {
  positive: number;
  neutral: number;
  negative: number;
}

const SENTIMENT_ICONS: Record<Sentiment, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

interface AggregateSentiment {
  counts: VoteCounts;
  percentages: VoteCounts;
  dominant: Sentiment;
  dominantEmotion: string;
  trend: 'improving' | 'stable' | 'worsening';
  totalAnalyzed: number;
}

export const FanSentimentWidget: FC = () => {
  // AI-analyzed incident sentiment (from /api/sentiment)
  const [aiSentiment, setAiSentiment] = useState<AggregateSentiment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fan votes (local state — would be Firestore in production)
  const [votes, setVotes] = useState<VoteCounts>({ positive: 0, neutral: 0, negative: 0 });
  const [userVoted, setUserVoted] = useState<Sentiment | null>(null);

  // Fetch AI sentiment analysis every 30 seconds
  useEffect(() => {
    let mounted = true;
    const fetchSentiment = async (): Promise<void> => {
      try {
        const authToken = localStorage.getItem('stadiumops_auth_token') ?? '';
        const response = await fetch('/api/sentiment', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
        const data = (await response.json()) as { result: AggregateSentiment };
        if (!mounted) return;
        setAiSentiment(data.result);
        setAiError(null);
      } catch (err) {
        if (!mounted) return;
        setAiError(err instanceof Error ? err.message : 'Failed to load sentiment');
      } finally {
        if (mounted) setAiLoading(false);
      }
    };

    void fetchSentiment();
    const interval = setInterval(() => {
      void fetchSentiment();
    }, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleVote = (sentiment: Sentiment): void => {
    if (userVoted) return;
    setUserVoted(sentiment);
    setVotes((prev) => ({ ...prev, [sentiment]: prev[sentiment] + 1 }));
  };

  // Combine AI sentiment + fan votes for the displayed totals
  const combined: VoteCounts = {
    positive: votes.positive + (aiSentiment?.counts.positive ?? 0),
    neutral: votes.neutral + (aiSentiment?.counts.neutral ?? 0),
    negative: votes.negative + (aiSentiment?.counts.negative ?? 0),
  };

  const total = combined.positive + combined.neutral + combined.negative;
  const percentages: VoteCounts = {
    positive: total > 0 ? Math.round((combined.positive / total) * 100) : 0,
    neutral: total > 0 ? Math.round((combined.neutral / total) * 100) : 0,
    negative: total > 0 ? Math.round((combined.negative / total) * 100) : 0,
  };

  const dominant: Sentiment =
    combined.positive >= combined.neutral && combined.positive >= combined.negative
      ? 'positive'
      : combined.neutral >= combined.negative
        ? 'neutral'
        : 'negative';

  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
  const trendIcon =
    aiSentiment?.trend === 'improving' ? '↑' : aiSentiment?.trend === 'worsening' ? '↓' : '→';
  const trendColor =
    aiSentiment?.trend === 'improving'
      ? 'var(--color-success)'
      : aiSentiment?.trend === 'worsening'
        ? 'var(--color-critical)'
        : 'var(--color-text-subtle)';

  return (
    <section className="sentiment-widget" aria-label="Fan sentiment">
      <h3 className="section-title">📊 Fan Sentiment</h3>
      <p className="sentiment-question">AI-analyzed sentiment from recent incidents + fan votes</p>

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
              <span className="sentiment-label">{SENTIMENT_LABELS[s]}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="sentiment-voted" role="status" aria-live="polite">
          Thanks for voting! You voted {SENTIMENT_ICONS[userVoted]} {SENTIMENT_LABELS[userVoted]}.
        </p>
      )}

      {aiLoading && (
        <p className="sentiment-loading" role="status" aria-live="polite">
          <span className="vision-spinner" aria-hidden="true" /> AI analyzing incidents...
        </p>
      )}

      {aiError && (
        <p className="sentiment-error" role="alert">
          AI analysis unavailable: {aiError}
        </p>
      )}

      {aiSentiment && (
        <div className="sentiment-ai-summary" role="status" aria-live="polite">
          <span className="sentiment-ai-label">AI trend:</span>{' '}
          <span style={{ color: trendColor, fontWeight: 600 }}>
            {trendIcon} {aiSentiment.trend}
          </span>
          <span className="sentiment-ai-meta">
            {' '}
            · dominant emotion: {aiSentiment.dominantEmotion} · {String(aiSentiment.totalAnalyzed)}{' '}
            incidents analyzed
          </span>
        </div>
      )}

      {/* Live bar chart */}
      <div className="sentiment-chart" aria-label={`Live results: ${String(total)} data points`}>
        {sentiments.map((s) => (
          <div key={s} className="sentiment-bar-row">
            <span className="sentiment-bar-label" aria-hidden="true">
              {SENTIMENT_ICONS[s]} {SENTIMENT_LABELS[s]}
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
          {String(total)} data points • Dominant: <strong>{SENTIMENT_LABELS[dominant]}</strong>
        </span>
      </p>
    </section>
  );
};
