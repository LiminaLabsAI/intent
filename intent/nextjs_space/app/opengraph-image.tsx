import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const alt = 'Flow - Intent Lifecycle Management';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          border: '16px solid #2563eb',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* A simple SVG lightning bolt for Flow */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#3b82f6" />
          </svg>
          <h1
            style={{
              fontSize: '80px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.05em',
            }}
          >
            Flow
          </h1>
        </div>
        <p
          style={{
            fontSize: '40px',
            color: '#475569',
            margin: 0,
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          Intent Lifecycle Management
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
