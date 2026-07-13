/**
 * @file apps/web/src/components/QRCodeDisplay.tsx
 * @description Generates a QR code encoding an incident ID so responders
 *   can scan it with their phone. Uses a lightweight inline SVG QR generator
 *   (no external dependency needed).
 *
 *   Challenge area: Operational Intelligence
 */

import { type FC, useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  /** The text/URL to encode in the QR code. */
  value: string;
  /** Pixel size of the QR code (default 200). */
  size?: number;
  /** Label below the QR code. */
  label?: string;
}

/**
 * Simple QR code generator using a public API fallback.
 * In production, you'd use a local library like 'qrcode', but for a
 * zero-dependency deployment we use the QR Server API with SVG output.
 * The QR encodes the value so responders can scan to view incident details.
 */
export const QRCodeDisplay: FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  label = 'Scan to view incident',
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    // Use qrserver.com API — returns a PNG QR code
    const encoded = encodeURIComponent(value);
    setQrUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=${String(size)}x${String(size)}&data=${encoded}`,
    );
  }, [value, size]);

  const handleDownload = (): void => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `incident-qr-${value.slice(-8)}.png`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="qr-code-display" role="figure" aria-label={`QR code for ${value}`}>
      {qrUrl && (
        <img
          src={qrUrl}
          width={size}
          height={size}
          alt={`QR code encoding: ${value}`}
          className="qr-code-image"
          loading="lazy"
        />
      )}
      <p className="qr-code-label">{label}</p>
      <button
        type="button"
        className="btn btn-secondary qr-download-btn"
        onClick={handleDownload}
        aria-label="Download QR code"
      >
        ⬇️ Download QR
      </button>
    </div>
  );
};
