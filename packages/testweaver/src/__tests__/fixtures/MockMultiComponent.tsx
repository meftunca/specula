export function AlphaPanel() {
  return (
    <section data-test-context="alpha" data-test-scenario="happy-path">
      <button data-test-id="alpha-action" data-test-step="click">
        Alpha
      </button>
    </section>
  );
}

export function BetaPanel() {
  return (
    <section data-test-context="beta" data-test-scenario="happy-path">
      <button data-test-id="beta-action" data-test-step="click">
        Beta
      </button>
    </section>
  );
}
