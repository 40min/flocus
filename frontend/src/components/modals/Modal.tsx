import React from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <DialogHeader>
          {title ? (
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {title}
            </DialogTitle>
          ) : (
            <DialogTitle className="sr-only">Modal dialog</DialogTitle>
          )}
          <DialogDescription className="sr-only">
            Modal dialog content
          </DialogDescription>
        </DialogHeader>
        <div ref={animationParent}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
