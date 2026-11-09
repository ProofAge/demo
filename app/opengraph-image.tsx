import { ogImage, OG_SIZE } from '@/components/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'ProofAge live demo';

export default function OgImage() {
  return ogImage('ProofAge verification demo', 'Facial age estimation, age verification by ID and KYC, run on yourself');
}
