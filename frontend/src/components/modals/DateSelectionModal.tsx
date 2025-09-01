import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "./Modal";
import { dayjs } from "../../utils/dateUtils";

interface DateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetDate: string) => void;
  title?: string;
  description?: string;
}

const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Select Target Date",
  description = "Choose the date to carry over this time window to:",
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().add(1, "day").format("YYYY-MM-DD")
  );

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedDate(dayjs().add(1, "day").format("YYYY-MM-DD"));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>

        <div className="space-y-2">
          <Label htmlFor="target-date">Target Date</Label>
          <Input
            id="target-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={dayjs().format("YYYY-MM-DD")}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedDate}>
            Carry Over
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DateSelectionModal;
