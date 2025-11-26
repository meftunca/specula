import { useState, type FormEvent } from "react";
import "./ContactForm.css";

interface ContactFormProps {
  onSubmit?: (data: ContactData) => void;
}

interface ContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const SUBJECTS = [
  { value: "", label: "Select a subject..." },
  { value: "general", label: "General Inquiry" },
  { value: "support", label: "Technical Support" },
  { value: "sales", label: "Sales Question" },
  { value: "feedback", label: "Feedback" },
];

/**
 * ContactForm Component
 *
 * This component demonstrates TestWeaver DSL attributes with:
 * - Select dropdown actions
 * - ARIA attribute expectations
 * - Class-based expectations
 * - Multiple selector types (role, label, placeholder)
 *
 * @test-context contact
 * @test-scenario submit-form
 * @test-route /contact
 */
export function ContactForm({ onSubmit }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate email format
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Submit
    setSubmitted(true);
    onSubmit?.({ name, email, subject, message });
  };

  if (submitted) {
    return (
      <div
        className="contact-container"
        data-test-context="contact"
        data-test-scenario="submit-form"
        data-test-route="/contact"
      >
        <div
          className="success-message"
          role="alert"
          aria-live="polite"
          data-test-id="success-alert"
          data-test-expect="visible; aria:live:polite; has-class:success-message"
        >
          <h3>Thank you!</h3>
          <p data-test-id="success-text" data-test-expect="text:received your message">
            We have received your message and will get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="contact-container"
      data-test-context="contact"
      data-test-scenario="submit-form"
      data-test-route="/contact"
    >
      <h2 className="contact-title">Contact Us</h2>

      <form onSubmit={handleSubmit} className="contact-form">
        {error && (
          <div
            className="error-message"
            role="alert"
            aria-live="assertive"
            data-test-id="error-message"
            data-test-expect="visible; aria:live:assertive"
          >
            {error}
          </div>
        )}

        {/* Name field with label selector */}
        <div className="form-group">
          <label htmlFor="contact-name">Full Name *</label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            aria-required="true"
            data-test-id="name-input"
            data-test-label="Full Name *"
            data-test-step="type:John Doe"
          />
        </div>

        {/* Email field with placeholder selector */}
        <div className="form-group">
          <label htmlFor="contact-email">Email Address *</label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-required="true"
            data-test-id="email-input"
            data-test-placeholder="Enter your email"
            data-test-step="type:john@example.com"
          />
        </div>

        {/* Subject dropdown with select action */}
        <div className="form-group">
          <label htmlFor="contact-subject">Subject *</label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-required="true"
            data-test-id="subject-select"
            data-test-role="combobox"
            data-test-step="select:support"
          >
            {SUBJECTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message textarea */}
        <div className="form-group">
          <label htmlFor="contact-message">Message *</label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={5}
            aria-required="true"
            data-test-id="message-textarea"
            data-test-step="type:I need help with my account settings."
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="submit-button"
          data-test-id="submit-btn"
          data-test-step="click"
        >
          Send Message
        </button>
      </form>
    </div>
  );
}
