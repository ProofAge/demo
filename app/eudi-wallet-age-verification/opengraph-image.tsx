import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'EUDI Wallet age verification — live demo by ProofAge';

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
        <div style={{ fontSize: 24, letterSpacing: '0.3em', color: '#c8862a', textTransform: 'uppercase' }}>
          Live demo
        </div>
        <div style={{ marginTop: 24, fontSize: 64, fontWeight: 300, letterSpacing: '0.02em' }}>
          EUDI Wallet age verification
        </div>
        <div style={{ marginTop: 20, fontSize: 28, color: '#8a7a6a' }}>
          Prove you are 18+ with a digital ID wallet · ProofAge
        </div>
      </div>
    ),
    { ...size },
  );
}
