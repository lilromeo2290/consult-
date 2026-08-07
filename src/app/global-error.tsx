'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error to console so it can be found in browser devtools
    console.error('Global error boundary caught:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    // Also try to report to our API so we can check server logs
    try {
      fetch('/api/rms-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'rms-error-log',
          data: {
            message: error.message,
            stack: error.stack,
            digest: error.digest,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch {}
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#fef2f2', color: '#991b1b' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Application Error</h2>
          <p style={{ marginBottom: 8 }}>A client-side exception has occurred.</p>
          <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error.message}
          </div>
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>Stack Trace</summary>
            <pre style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: 16, fontSize: 11, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {error.stack}
            </pre>
          </details>
          <button
            onClick={reset}
            style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
