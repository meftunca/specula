import { useEffect, useRef } from "react";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Modal Component
 *
 * This component demonstrates TestWeaver DSL attributes for:
 * - Modal accessibility testing
 * - ARIA attribute expectations
 * - Keyboard interactions (Escape key to close)
 * - Focus management
 *
 * @test-context modal
 * @test-scenario accessibility
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-test-context="modal"
      data-test-scenario="accessibility"
    >
      <div
        ref={modalRef}
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        data-test-id="modal-dialog"
        data-test-expect="visible; aria:modal:true; aria:labelledby:modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            data-test-id="close-button"
            data-test-role="button"
            data-test-step="click"
            data-test-expect="aria:label:Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-content" data-test-id="modal-content">
          {children}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="modal-button secondary"
            onClick={onClose}
            data-test-id="cancel-button"
            data-test-step="click"
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-button primary"
            data-test-id="confirm-button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ModalTrigger Component for demonstration
 *
 * Shows a typical pattern of opening a modal
 *
 * @test-context modal-trigger
 * @test-scenario open-modal
 */
export function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="modal-demo"
      data-test-context="modal-trigger"
      data-test-scenario="open-modal"
    >
      <h2>Modal Demo</h2>
      <button
        type="button"
        className="trigger-button"
        onClick={() => setIsOpen(true)}
        data-test-id="open-modal-btn"
        data-test-step="click"
      >
        Open Modal
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmation"
      >
        <p
          data-test-id="modal-message"
          data-test-expect="visible; text:Are you sure"
        >
          Are you sure you want to proceed with this action?
        </p>
      </Modal>

      {!isOpen && (
        <div
          data-test-id="modal-closed-indicator"
          data-test-expect="visible; not-has-class:hidden"
        >
          Modal is closed
        </div>
      )}
    </div>
  );
}

// Fix: Need to import useState
import { useState } from "react";
