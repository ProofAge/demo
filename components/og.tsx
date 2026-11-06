import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** The page's H1 on a plain background, so a pasted link previews its own vertical. */
export function ogImage(title: string, subtitle: string): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#f7f8f5', color: '#0f1a16', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 600 }}>
          ProofAge
          <span style={{ marginLeft: 12, fontWeight: 400, color: '#56635d' }}>live demo</span>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>{title}</div>
        <div style={{ marginTop: 24, fontSize: 30, color: '#56635d' }}>{subtitle}</div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
