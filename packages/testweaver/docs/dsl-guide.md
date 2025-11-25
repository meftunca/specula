# DSL Guide

Complete reference for TestWeaver's Domain Specific Language (DSL).

## Overview

TestWeaver uses HTML data attributes to annotate React components with test instructions. These attributes are parsed at build time to generate test files.

## Context Definition

### data-test-context

Defines a test suite or context. All test elements must be children of an element with this attribute.

```tsx
<div data-test-context="login">
  {/* All test elements go here */}
</div>
```

- **Required**: Yes, for test generation
- **Values**: Kebab-case or camelCase string (e.g., "login", "user-profile")
- **Generated output**: Creates `describe("login", () => {...})` block

### data-test-scenario

Names a specific test case within a context.

```tsx
<div
  data-test-context="login"
  data-test-scenario="happy-path"
>
  {/* Test case elements */}
</div>
```

- **Required**: No (defaults to "default")
- **Values**: Descriptive string
- **Generated output**: Creates `it("happy-path", async () => {...})` block

### data-test-route

Specifies the URL route for E2E tests.

```tsx
<div
  data-test-context="login"
  data-test-scenario="happy-path"
  data-test-route="/login"
>
  {/* ... */}
</div>
```

- **Required**: No (defaults to "/")
- **Effect**: Generates `await page.goto("/login")` in Playwright tests

## Selectors

Elements with test steps or expectations need selectors to be targeted in generated tests.

### data-test-id

The primary selector method using a unique test identifier.

```tsx
<input data-test-id="email" />
```

**Generated code:**
- Vitest: `screen.getByTestId("email")`
- Playwright: `page.locator('[data-test-id="email"]')`

### data-test-role

Selector using ARIA role. Preferred for accessibility testing.

```tsx
<button data-test-role="button" />
```

**Generated code:**
- Vitest: `screen.getByRole("button")`
- Playwright: `page.getByRole("button")`

### data-test-label

Selector using associated label text.

```tsx
<input data-test-label="Email Address" />
```

**Generated code:**
- Vitest: `screen.getByLabelText("Email Address")`
- Playwright: `page.getByLabel("Email Address")`

### data-test-placeholder

Selector using placeholder text.

```tsx
<input data-test-placeholder="Enter your email" />
```

**Generated code:**
- Vitest: `screen.getByPlaceholderText("Enter your email")`
- Playwright: `page.getByPlaceholder("Enter your email")`

### Selector Priority

When multiple selector attributes are present, they're used in this order:
1. `data-test-id` (highest priority)
2. `data-test-role`
3. `data-test-label`
4. `data-test-placeholder`

## Step Actions

The `data-test-step` attribute defines user interactions.

### click

Clicks on an element.

```tsx
<button data-test-id="submit" data-test-step="click">
  Submit
</button>
```

**Generated:**
- Vitest: `fireEvent.click(screen.getByTestId("submit"));`
- Playwright: `await page.locator('[data-test-id="submit"]').click();`

### type:value

Types text into an input field.

```tsx
<input data-test-id="email" data-test-step="type:user@example.com" />
```

**Generated:**
- Vitest: `fireEvent.change(screen.getByTestId("email"), { target: { value: "user@example.com" } });`
- Playwright: `await page.locator('[data-test-id="email"]').fill("user@example.com");`

### change:value

Fires a change event with a specific value.

```tsx
<input data-test-id="quantity" data-test-step="change:5" />
```

Similar to `type`, but semantically represents a change event.

### select:value

Selects an option from a dropdown.

```tsx
<select data-test-id="country" data-test-step="select:USA">
  <option value="USA">United States</option>
  <option value="UK">United Kingdom</option>
</select>
```

**Generated:**
- Vitest: `fireEvent.change(screen.getByTestId("country"), { target: { value: "USA" } });`
- Playwright: `await page.locator('[data-test-id="country"]').selectOption("USA");`

### focus

Focuses an element.

```tsx
<input data-test-id="name" data-test-step="focus" />
```

### blur

Blurs (unfocuses) an element.

```tsx
<input data-test-id="name" data-test-step="blur" />
```

### hover

Hovers over an element.

```tsx
<div data-test-id="tooltip-trigger" data-test-step="hover">
  Hover me
</div>
```

**Generated:**
- Vitest: `fireEvent.mouseOver(screen.getByTestId("tooltip-trigger"));`
- Playwright: `await page.locator('[data-test-id="tooltip-trigger"]').hover();`

### clear

Clears the value of an input.

```tsx
<input data-test-id="search" data-test-step="clear" />
```

**Generated:**
- Vitest: `fireEvent.change(screen.getByTestId("search"), { target: { value: "" } });`
- Playwright: `await page.locator('[data-test-id="search"]').clear();`

### key:KeyName

Presses a keyboard key.

```tsx
<input data-test-id="search" data-test-step="key:Enter" />
```

**Common keys:** Enter, Escape, Tab, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Backspace, Delete

**Generated:**
- Vitest: `fireEvent.keyDown(screen.getByTestId("search"), { key: "Enter" });`
- Playwright: `await page.locator('[data-test-id="search"]').press("Enter");`

### waitFor

Waits for an element to appear.

```tsx
<div data-test-id="loading" data-test-step="waitFor" />
```

**Generated:**
- Vitest: `await waitFor(() => screen.getByTestId("loading"));`
- Playwright: `await page.locator('[data-test-id="loading"]').waitFor();`

### submitContext

Submits a form (functionally equivalent to click for submit buttons).

```tsx
<button type="submit" data-test-id="submit" data-test-step="submitContext">
  Submit Form
</button>
```

### Combining Multiple Steps

Use semicolons to combine multiple steps:

```tsx
<input
  data-test-id="search"
  data-test-step="type:hello; key:Enter"
/>
```

This generates:
1. Type "hello" into the input
2. Press Enter

## Expectations

The `data-test-expect` attribute defines assertions.

### visible / not-visible

Checks element visibility.

```tsx
<div data-test-id="message" data-test-expect="visible">
  Hello!
</div>
```

**Generated:**
- Vitest: `expect(screen.getByTestId("message")).toBeVisible();`
- Playwright: `await expect(page.locator('[data-test-id="message"]')).toBeVisible();`

### exists / not-exists

Checks if element exists in the DOM.

```tsx
<div data-test-id="item" data-test-expect="exists" />
```

**Generated:**
- Vitest: `expect(screen.getByTestId("item")).toBeInTheDocument();`
- Playwright: `await expect(page.locator('[data-test-id="item"]')).toBeAttached();`

### text:value

Checks if element contains text.

```tsx
<div data-test-id="message" data-test-expect="text:Welcome">
  Welcome, User!
</div>
```

**Generated:**
- Vitest: `expect(screen.getByTestId("message")).toHaveTextContent("Welcome");`
- Playwright: `await expect(page.locator('[data-test-id="message"]')).toContainText("Welcome");`

### exact-text:value

Checks for exact text match.

```tsx
<div data-test-id="count" data-test-expect="exact-text:5">
  5
</div>
```

**Generated:**
- Vitest: `expect(screen.getByTestId("count")).toHaveTextContent(/^5$/);`
- Playwright: `await expect(page.locator('[data-test-id="count"]')).toHaveText("5");`

### value:val

Checks input value.

```tsx
<input data-test-id="email" data-test-expect="value:test@example.com" />
```

**Generated:**
- Vitest: `expect(screen.getByTestId("email")).toHaveValue("test@example.com");`
- Playwright: `await expect(page.locator('[data-test-id="email"]')).toHaveValue("test@example.com");`

### has-class:name / not-has-class:name

Checks CSS class presence.

```tsx
<button data-test-id="btn" data-test-expect="has-class:active">
  Active
</button>
```

**Generated:**
- Vitest: `expect(screen.getByTestId("btn")).toHaveClass("active");`
- Playwright: `await expect(page.locator('[data-test-id="btn"]')).toHaveClass(/active/);`

### aria:attribute / aria:attribute:value

Checks ARIA attributes.

```tsx
<!-- Check attribute exists -->
<div data-test-id="modal" data-test-expect="aria:modal">
  Modal content
</div>

<!-- Check attribute value -->
<div data-test-id="alert" data-test-expect="aria:live:polite">
  Alert message
</div>
```

**Generated (for aria:live:polite):**
- Vitest: `expect(screen.getByTestId("alert")).toHaveAttribute("aria-live", "polite");`
- Playwright: `await expect(page.locator('[data-test-id="alert"]')).toHaveAttribute("aria-live", "polite");`

### url-contains:path / url-exact:path

Checks URL (typically for E2E tests).

```tsx
<div data-test-expect="url-contains:/dashboard">
  Dashboard content
</div>
```

**Generated:**
- Playwright: `await expect(page).toHaveURL(/dashboard/);`

### snapshot

Takes a visual snapshot.

```tsx
<div data-test-id="chart" data-test-expect="snapshot">
  Chart content
</div>
```

**Generated:**
- Vitest: `expect(screen.getByTestId("chart")).toMatchSnapshot();`
- Playwright: `await expect(page.locator('[data-test-id="chart"]')).toHaveScreenshot();`

### Combining Multiple Expectations

Use semicolons to combine multiple expectations:

```tsx
<div
  data-test-id="success"
  data-test-expect="visible; text:Success; has-class:success-message"
>
  Success!
</div>
```

## Complete Example

```tsx
<div
  data-test-context="user-registration"
  data-test-scenario="successful-signup"
  data-test-route="/register"
>
  <form>
    <input
      data-test-id="username"
      data-test-label="Username"
      data-test-step="type:john_doe"
      placeholder="Choose a username"
    />
    
    <input
      data-test-id="email"
      data-test-placeholder="Enter your email"
      data-test-step="type:john@example.com"
    />
    
    <select
      data-test-id="country"
      data-test-role="combobox"
      data-test-step="select:USA"
    >
      <option value="">Select country...</option>
      <option value="USA">United States</option>
    </select>
    
    <button
      data-test-id="submit"
      data-test-role="button"
      data-test-step="click"
    >
      Create Account
    </button>
  </form>
  
  <div
    role="alert"
    aria-live="polite"
    data-test-id="success-message"
    data-test-expect="visible; aria:live:polite; text:Account created"
  >
    Account created successfully!
  </div>
</div>
```
