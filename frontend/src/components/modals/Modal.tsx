import React from "react";
import { createPortal } from "react-dom";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [animationParent] = useAutoAnimate({
    duration: 200,
    easing: "ease-in-out",
  });

  if (!isOpen) {
    return null;
  }
  // Only attempt to access document and modal-root if on client side and modal is open
  if (typeof window !== "undefined") {
    const modalRoot = document.getElementById("modal-root");
    if (!modalRoot) {
      // If modal-root doesn't exist, don't render the portal
      // This might happen during initial page load or if the element is missing
      console.warn("Modal: 'modal-root' element not found in the DOM.");
      return null;
    }

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div
          ref={animationParent}
          className="relative w-full max-w-lg transform rounded-xl bg-white p-6 shadow-xl transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
        >
          {title && (
            <div className="mb-4">
              <h3
                id="modal-title"
                className="text-xl font-semibold text-slate-900"
              >
                {title}
              </h3>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {children}
        </div>
      </div>,
      modalRoot
    );
  } else {
    // If not on client (e.g. SSR), don't render the portal
    return null;
  }
};

export default Modal;
