const BOXES = [
  { name: 'The Smoked Oak Box', text: 'Three small-batch single malts aged in charred oak, with tasting notes from the distiller.' },
  { name: 'The Amber Hour Box', text: 'Aperitifs and bitters for slow evenings, with a card of five classic recipes.' },
  { name: 'The Night Market Box', text: 'Rare finds from independent makers, picked by our members each month.' },
];

/** Fictional members-only content: what the store unlocks once age is confirmed. */
export function MembersContent() {
  return (
    <section aria-labelledby="members-title" className="mt-14">
      <p className="text-[10px] uppercase tracking-[0.35em] text-ember-amber">Members only</p>
      <h2 id="members-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-light text-ember-cream">
        This month&apos;s boxes
      </h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {BOXES.map((box) => (
          <li key={box.name} className="border border-ember-amber/20 bg-white/[0.03] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-xl text-ember-cream">{box.name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ember-smoke">{box.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ember-smoke">Ember Box is fictional. Nothing here is for sale.</p>
    </section>
  );
}
