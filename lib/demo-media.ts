/** A media file may be read only by the visitor who owns the verification, and only if it is listed and still stored. */
export function authoriseMedia(input: {
  visitorId: string | null;
  externalId: string | null;
  mediaId: string;
  media: { id: string; url: string | null }[];
}): { ok: true } | { ok: false; status: 404 } {
  const owned = input.visitorId !== null && input.externalId !== null && input.externalId === input.visitorId;
  const listed = input.media.some((item) => item.id === input.mediaId && item.url !== null);
  return owned && listed ? { ok: true } : { ok: false, status: 404 };
}

/** Images only: anything else is served as an opaque download, never as something a browser would run. */
export function sniffContentType(head: Uint8Array): string {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image/jpeg';
  }
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return 'image/png';
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

export function mediaHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  };
}
