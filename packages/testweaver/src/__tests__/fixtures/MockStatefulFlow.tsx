export function MockStatefulFlow() {
  return (
    <>
      <section
        data-test-context="login"
        data-test-scenario="submit"
        data-test-state="success"
        data-test-route="/login"
      >
        <button data-test-id="submit" data-test-step="click">
          Submit
        </button>
        <div data-test-id="success-banner" data-test-expect="visible; text:Welcome back">
          Welcome back
        </div>
      </section>

      <section
        data-test-context="login"
        data-test-scenario="submit"
        data-test-state="error"
        data-test-route="/login"
      >
        <button data-test-id="submit" data-test-step="click">
          Submit
        </button>
        <div data-test-id="error-banner" data-test-expect="visible; text:Invalid credentials">
          Invalid credentials
        </div>
      </section>
    </>
  );
}