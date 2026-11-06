import { ogImage, OG_SIZE } from '@/components/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'EUDI Wallet age verification — live demo by ProofAge';

export default function OgImage() {
  return ogImage('Prove you are 18+ with a digital ID wallet', 'EUDI Wallet age verification · live demo');
}
