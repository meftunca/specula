# Examples

Real-world examples demonstrating TestWeaver's capabilities.

## Basic Login Form

A simple login form with email and password fields.

### Component

```tsx
// src/components/Login.tsx
import { useState, type FormEvent } from "react";

export function Login({ onSuccess }: { onSuccess?: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.includes("@")) {
      setError("Invalid email address");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setSuccess(true);
    onSuccess?.(email);
  };

  return (
    <div
      data-test-context="login"
      data-test-scenario="happy-path"
      data-test-route="/login"
    >
      {success ? (
        <div
          data-test-id="success-message"
          data-test-expect="visible; text:Welcome"
        >
          Welcome! Login successful.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              data-test-id="error-message"
              data-test-expect="visible"
            >
              {error}
            </div>
          )}
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            data-test-id="email"
            data-test-step="type:user@example.com"
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            data-test-id="password"
            data-test-step="type:123456"
          />
          
          <button
            type="submit"
            data-test-id="submit"
            data-test-step="click"
          >
            Login
          </button>
        </form>
      )}
    </div>
  );
}
```

### Generated Vitest Test

```tsx
// __generated__/vitest/login.happy-path.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Login } from "src/components/Login.tsx";

describe("login", () => {
  it("happy-path", async () => {
    render(<Login />);

    const email = () => screen.getByTestId("email");
    const password = () => screen.getByTestId("password");
    const submit = () => screen.getByTestId("submit");
    const successMessage = () => screen.getByTestId("success-message");

    // Steps
    fireEvent.change(email(), { target: { value: "user@example.com" } });
    fireEvent.change(password(), { target: { value: "123456" } });
    fireEvent.click(submit());

    // Expectations
    expect(successMessage()).toBeVisible();
    expect(successMessage()).toHaveTextContent("Welcome");
  });
});
```

### Generated Playwright Test

```typescript
// __generated__/e2e/login.happy-path.spec.ts
import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test("happy-path", async ({ page }) => {
    await page.goto("/login");

    const email = page.locator('[data-test-id="email"]');
    const password = page.locator('[data-test-id="password"]');
    const submit = page.locator('[data-test-id="submit"]');
    const successMessage = page.locator('[data-test-id="success-message"]');

    // Steps
    await email.fill("user@example.com");
    await password.fill("123456");
    await submit.click();

    // Expectations
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText("Welcome");
  });
});
```

---

## Contact Form with Select

A form with dropdown selection and ARIA accessibility.

### Component

```tsx
// src/components/ContactForm.tsx
import { useState, type FormEvent } from "react";

const SUBJECTS = [
  { value: "", label: "Select a subject..." },
  { value: "general", label: "General Inquiry" },
  { value: "support", label: "Technical Support" },
  { value: "sales", label: "Sales Question" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name && email && subject && message) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div
        data-test-context="contact"
        data-test-scenario="submit-form"
        data-test-route="/contact"
      >
        <div
          role="alert"
          aria-live="polite"
          data-test-id="success-alert"
          data-test-expect="visible; aria:live:polite; has-class:success-message"
        >
          Thank you! We've received your message.
        </div>
      </div>
    );
  }

  return (
    <div
      data-test-context="contact"
      data-test-scenario="submit-form"
      data-test-route="/contact"
    >
      <form onSubmit={handleSubmit}>
        <input
          aria-required="true"
          data-test-id="name-input"
          data-test-label="Full Name"
          data-test-step="type:John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          aria-required="true"
          data-test-id="email-input"
          data-test-placeholder="Enter your email"
          data-test-step="type:john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          aria-required="true"
          data-test-id="subject-select"
          data-test-role="combobox"
          data-test-step="select:support"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          {SUBJECTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <textarea
          data-test-id="message-textarea"
          data-test-step="type:I need help with my account."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          type="submit"
          data-test-id="submit-btn"
          data-test-step="click"
        >
          Send Message
        </button>
      </form>
    </div>
  );
}
```

### Generated Playwright Test

```typescript
// __generated__/e2e/contact.submit-form.spec.ts
import { test, expect } from "@playwright/test";

test.describe("contact", () => {
  test("submit-form", async ({ page }) => {
    await page.goto("/contact");

    const nameInput = page.locator('[data-test-id="name-input"]');
    const emailInput = page.locator('[data-test-id="email-input"]');
    const subjectSelect = page.locator('[data-test-id="subject-select"]');
    const messageTextarea = page.locator('[data-test-id="message-textarea"]');
    const submitBtn = page.locator('[data-test-id="submit-btn"]');
    const successAlert = page.locator('[data-test-id="success-alert"]');

    // Steps
    await nameInput.fill("John Doe");
    await emailInput.fill("john@example.com");
    await subjectSelect.selectOption("support");
    await messageTextarea.fill("I need help with my account.");
    await submitBtn.click();

    // Expectations
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toHaveAttribute("aria-live", "polite");
    await expect(successAlert).toHaveClass(/success-message/);
  });
});
```

---

## Modal with Accessibility

An accessible modal dialog with ARIA attributes.

### Component

```tsx
// src/components/Modal.tsx
import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeRef.current) {
      closeRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      data-test-context="modal"
      data-test-scenario="accessibility"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        data-test-id="modal-dialog"
        data-test-expect="visible; aria:modal:true; aria:labelledby:modal-title"
      >
        <h2 id="modal-title">{title}</h2>
        
        <button
          ref={closeRef}
          aria-label="Close modal"
          data-test-id="close-button"
          data-test-role="button"
          data-test-step="click"
          data-test-expect="aria:label:Close modal"
          onClick={onClose}
        >
          ×
        </button>
        
        <div data-test-id="modal-content">
          {children}
        </div>
        
        <button
          data-test-id="cancel-button"
          data-test-step="click"
          onClick={onClose}
        >
          Cancel
        </button>
        
        <button data-test-id="confirm-button">
          Confirm
        </button>
      </div>
    </div>
  );
}
```

---

## Search with Keyboard Navigation

A search component with keyboard interaction.

### Component

```tsx
// src/components/Search.tsx
import { useState, type FormEvent } from "react";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    // Simulated search
    setResults([
      `Result for "${query}" - Item 1`,
      `Result for "${query}" - Item 2`,
    ]);
  };

  return (
    <div
      data-test-context="search"
      data-test-scenario="keyboard-search"
      data-test-route="/search"
    >
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          data-test-id="search-input"
          data-test-step="type:react testing; key:Enter"
        />
      </form>

      {results.length > 0 && (
        <ul
          data-test-id="search-results"
          data-test-expect="visible; exists"
        >
          {results.map((result, i) => (
            <li key={i}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Multiple Scenarios

Define multiple test scenarios in the same component:

```tsx
// src/components/Auth.tsx
export function Auth() {
  return (
    <>
      {/* Happy Path Scenario */}
      <div
        data-test-context="auth"
        data-test-scenario="successful-login"
        data-test-route="/auth"
      >
        <input
          data-test-id="login-email"
          data-test-step="type:valid@email.com"
        />
        <input
          data-test-id="login-password"
          data-test-step="type:validPassword123"
        />
        <button
          data-test-id="login-submit"
          data-test-step="click"
        />
        <div
          data-test-id="login-success"
          data-test-expect="visible; text:Welcome"
        >
          Welcome!
        </div>
      </div>

      {/* Error Scenario */}
      <div
        data-test-context="auth"
        data-test-scenario="invalid-credentials"
        data-test-route="/auth"
      >
        <input
          data-test-id="error-email"
          data-test-step="type:invalid@email.com"
        />
        <input
          data-test-id="error-password"
          data-test-step="type:wrong"
        />
        <button
          data-test-id="error-submit"
          data-test-step="click"
        />
        <div
          data-test-id="error-message"
          data-test-expect="visible; text:Invalid credentials; has-class:error"
        >
          Invalid credentials
        </div>
      </div>
    </>
  );
}
```

This generates two separate test files:
- `auth.successful-login.test.tsx`
- `auth.invalid-credentials.test.tsx`

---

## Using Alternative Selectors

Examples using role, label, and placeholder selectors instead of test IDs:

```tsx
// Using role-based selectors
<button
  role="button"
  data-test-role="button"
  data-test-step="click"
>
  Submit
</button>

// Using label-based selectors
<label>
  Email Address
  <input
    data-test-label="Email Address"
    data-test-step="type:user@example.com"
  />
</label>

// Using placeholder-based selectors
<input
  placeholder="Search products..."
  data-test-placeholder="Search products..."
  data-test-step="type:laptop"
/>
```

---

## Tips for Effective Tests

> Not: Bu sayfadaki component örneklerinin bazıları, React-first stable scope’un ötesindeki daha geniş vizyonu göstermek için yer alır. Bugün en güvenilir akış React TSX/JSX + attribute DSL + Vitest/Playwright kombinasyonudur.

1. **Use descriptive test IDs**: `data-test-id="login-email-input"` is better than `data-test-id="input1"`

2. **Group related elements**: Keep context elements together in your JSX

3. **Prefer ARIA roles**: For accessibility testing, use `data-test-role` over `data-test-id`

4. **Combine expectations**: Use multiple expectations for thorough assertions
   ```tsx
   data-test-expect="visible; text:Success; has-class:success; aria:live:polite"
   ```

5. **Use meaningful scenarios**: Name scenarios after the user story they represent
   ```tsx
   data-test-scenario="user-registers-with-valid-email"
   ```
