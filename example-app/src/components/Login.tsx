import { useState, type FormEvent } from "react";
import "./Login.css";

interface LoginProps {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

/**
 * Login Component
 *
 * This component demonstrates the TestWeaver DSL attributes for
 * automatic test generation.
 *
 * @test-context login
 * @test-scenario happy-path
 * @test-route /login
 */
export function Login({ onSuccess, onError }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simple validation
    if (!email.includes("@")) {
      setError("Invalid email address");
      setIsLoading(false);
      onError?.("Invalid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      onError?.("Password must be at least 6 characters");
      return;
    }

    // Success
    setSuccess(true);
    setIsLoading(false);
    onSuccess?.(email);
  };

  return (
    <div
      className="login-container"
      data-test-context="login"
      data-test-scenario="happy-path"
      data-test-route="/login"
    >
      <h2 className="login-title">Login</h2>

      {success ? (
        <div
          className="success-message"
          data-test-id="success-message"
          data-test-expect="visible; text:Welcome"
        >
          Welcome! Login successful.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div
              className="error-message"
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              data-test-id="email"
              data-test-step="type:user@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              data-test-id="password"
              data-test-step="type:123456"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
            data-test-id="submit"
            data-test-step="click"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      )}
    </div>
  );
}
