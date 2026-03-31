import { VerifyButton } from '@/components/VerifyButton';
import { SuccessState } from '@/components/SuccessState';
import type { KycResult } from '@/types/kyc';

type HeroProps = {
  verified: boolean;
  apiUrl: string;
  apiKey: string;
  sdkUrl: string;
  onVerified: (result: KycResult) => void;
  onErrorMessage: (message: string) => void;
};

export function Hero({ verified, apiUrl, apiKey, sdkUrl, onVerified, onErrorMessage }: HeroProps) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-12 pt-28 md:grid-cols-2 md:px-16 md:pb-16 md:pt-32">
        <div className="z-10 flex flex-col justify-center">
          {verified ? (
            <SuccessState />
          ) : (
            <>
              <p className="mb-6 animate-fade-up text-[10px] uppercase tracking-[0.35em] text-ember-amber">
                Members only · Demo
              </p>
              <h1 className="animate-fade-up font-[family-name:var(--font-display)] text-[clamp(2.5rem,5vw,3.75rem)] font-light leading-[1.05] text-ember-cream [animation-delay:0.1s]">
                Curated collections for <em className="text-ember-amber-light not-italic">discerning</em> adults
              </h1>
              <p className="mt-8 max-w-md animate-fade-up text-sm leading-relaxed text-ember-smoke [animation-delay:0.2s]">
                Ember Box is a fictional brand for this ProofAge integration demo. Verify your age to continue — quick,
                private, and secure.
              </p>

              <div className="relative mt-10 animate-fade-up border border-ember-amber/20 bg-white/[0.03] p-10 [animation-delay:0.3s] before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-ember-amber before:to-transparent">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-normal text-ember-cream">
                  Claim your Ember Box
                </h2>
                <p className="mt-2 text-xs leading-relaxed tracking-wide text-ember-smoke">
                  Age verification is required before accessing restricted content. Powered by ProofAge.
                </p>
                <div className="mt-8">
                  <VerifyButton
                    apiUrl={apiUrl}
                    apiKey={apiKey}
                    sdkUrl={sdkUrl}
                    onVerified={onVerified}
                    onErrorMessage={onErrorMessage}
                  />
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-ember-smoke/20" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ember-smoke">about 60 seconds</span>
                  <div className="h-px flex-1 bg-ember-smoke/20" />
                </div>
                <p className="mt-6 text-center text-[11px] text-ember-smoke/60">
                  Powered by{' '}
                  <a href="https://proofage.xyz" target="_blank" rel="noopener noreferrer" className="text-ember-amber">
                    ProofAge
                  </a>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="relative hidden md:block">
          <div
            className="absolute inset-0 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at 30% 50%, rgba(200, 134, 42, 0.15) 0%, transparent 60%), linear-gradient(135deg, #3d2b1f 0%, #0d0a07 100%)',
            }}
          />
          <div className="relative flex min-h-[min(400px,50dvh)] items-center justify-center py-4">
            <div className="relative h-[280px] w-[280px] animate-float">
              <div
                className="absolute left-1/2 top-1/2 h-[180px] w-[240px] -translate-x-1/2 border border-ember-amber/30 bg-gradient-to-br from-[#5c3d28] to-[#2a1a0e] shadow-[20px_20px_60px_rgba(0,0,0,0.8)]"
                style={{ transform: 'translate(-50%, -45%) perspective(600px) rotateX(10deg) rotateY(-8deg)' }}
              >
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--font-display)] text-5xl font-light tracking-[0.25em] text-ember-amber/60">
                  EB
                </span>
              </div>
              <div className="absolute bottom-0 left-1/2 h-5 w-[200px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(200,134,42,0.3),transparent_70%)] blur-md" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
