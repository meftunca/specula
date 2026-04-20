export function MockParserEdgeCases() {
  return (
    <div>
      <section
        data-test-context="search"
        data-test-scenario="advanced"
        data-test-route="/search"
      >
        <input
          data-test-role="searchbox"
          data-test-step="type:laptop; waitFor"
        />

        <button
          data-test-label="Apply filters"
          data-test-step="click"
        >
          Apply filters
        </button>

        <input
          data-test-placeholder="Search products"
          data-test-step="clear"
        />

        <button
          data-test-id="priority-button"
          data-test-role="button"
          data-test-label="Priority"
          data-test-step="click"
        >
          Priority
        </button>

        <form
          data-test-id="filters-form"
          data-test-step="submitContext"
        />

        <div data-test-expect="url-contains:/search/results" />

        <div data-test-step="click" />

        <section
          data-test-context="search-filters"
          data-test-scenario="modal"
        >
          <button
            data-test-id="open-filters"
            data-test-step="click"
          >
            Open filters
          </button>
        </section>
      </section>
    </div>
  );
}
