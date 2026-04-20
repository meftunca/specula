import { useState, type FormEvent } from "react";
import "./Search.css";

interface SearchResult {
  id: number;
  title: string;
  description: string;
}

interface SearchProps {
  onSearch?: (query: string) => void;
}

/**
 * Search Component
 *
 * This component demonstrates the TestWeaver DSL attributes for
 * search functionality testing.
 *
 * @test-context search
 * @test-scenario happy-path
 * @test-route /search
 */
export function Search({ onSearch }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    onSearch?.(query);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: 1,
        title: `Result for "${query}" - Item 1`,
        description: "This is the first search result",
      },
      {
        id: 2,
        title: `Result for "${query}" - Item 2`,
        description: "This is the second search result",
      },
      {
        id: 3,
        title: `Result for "${query}" - Item 3`,
        description: "This is the third search result",
      },
    ];

    setResults(mockResults);
    setIsSearching(false);
  };

  return (
    <div
      className="search-container"
      data-test-context="search"
      data-test-scenario="happy-path"
      data-test-route="/search"
    >
      <h2 className="search-title">Search</h2>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query..."
            className="search-input"
            data-test-id="search-input"
            data-test-step="type:hello"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="search-button"
            data-test-id="search-submit"
            data-test-step="click"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {hasSearched && (
        <div
          className="search-results"
          data-test-id="search-results"
          data-test-expect="visible; exists"
        >
          {results.length > 0 ? (
            <ul className="results-list">
              {results.map((result) => (
                <li key={result.id} className="result-item">
                  <h3 className="result-title">{result.title}</h3>
                  <p className="result-description">{result.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-results" data-test-id="no-results">
              No results found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
