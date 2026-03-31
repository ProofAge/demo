import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1410 0%, #0d0a07 100%)',
          color: '#f5f0e8',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 300, letterSpacing: '0.05em' }}>ProofAge Demo</div>
        <div style={{ marginTop: 16, fontSize: 28, color: '#c8862a' }}>Age verification integration</div>
      </div>
    ),
    { ...size },
  );
}
