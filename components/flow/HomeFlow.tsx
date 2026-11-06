'use client';

import { useState } from 'react';
import { DemoProvider } from '@/components/demo/DemoProvider';
import { FlowPreview } from '@/components/flow/FlowPreview';
import { OptionsCard } from '@/components/flow/OptionsCard';
import { StartArea } from '@/components/flow/StartArea';
import { useDemo } from '@/components/demo/DemoProvider';
import { ResultArea } from '@/components/result/ResultArea';
import { optionsQuery, type DemoOptions } from '@/lib/demo-options';
import { HOME_PATH, slugFor, type WorkspaceSlug } from '@/lib/demo-pages';

/** The home page's interactive part: options, preview, start and result. */
export function HomeFlow({ initial, apiKeys }: { initial: DemoOptions; apiKeys: Partial<Record<WorkspaceSlug, string>> }) {
  return (
    <DemoProvider page={HOME_PATH} apiKeys={apiKeys}>
      <Flow initial={initial} />
    </DemoProvider>
  );
}

function Flow({ initial }: { initial: DemoOptions }) {
  const [options, setOptions] = useState(initial);
  const { panel } = useDemo();

  const change = (next: DemoOptions) => {
    setOptions(next);
    // A configured page can be shared: keep the URL in step with the options.
    window.history.replaceState(null, '', `${HOME_PATH}${optionsQuery(next)}`);
  };

  return (
    <>
      {/* On wide screens the preview sits beside the options, so Start is visible without scrolling. */}
      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start lg:gap-12">
        <FlowPreview check={options.check} look={options.look} />
        <div className="mx-auto mt-8 max-w-xl lg:mt-0">
          <OptionsCard options={options} onChange={change} disabled={panel.optionsDisabled} />
          <StartArea slug={slugFor(options.check, options.look)} opens={options.opens} check={options.check} />
        </div>
      </div>
      <ResultArea />
    </>
  );
}
