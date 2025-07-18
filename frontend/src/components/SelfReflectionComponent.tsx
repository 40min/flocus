import React, { useState, useEffect } from "react";
import Button from "components/Button";
import Input from "components/Input";
import { DailyPlanResponse, SelfReflection } from "types/dailyPlan";
import { getLlmReflectionSuggestion } from "services/dailyPlanService";
import { Save, Sparkles } from "lucide-react";

interface SuggestionBoxProps {
  suggestion: string;
  onApprove: () => void;
  onReject: () => void;
}

const SuggestionBox: React.FC<SuggestionBoxProps> = ({
  suggestion,
  onApprove,
  onReject,
}) => (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
    <p className="font-semibold mb-1">Suggestion:</p>
    <p>{suggestion}</p>
    <div className="flex justify-end gap-2 mt-2">
      <Button type="button" onClick={onApprove} variant="primary" size="small">
        Approve
      </Button>
      <Button type="button" onClick={onReject} variant="secondary" size="small">
        Reject
      </Button>
    </div>
  </div>
);

type ReflectionField = "positive" | "negative" | "follow_up_notes";

const useGenericLlmSuggestion = (
  initialValue: string,
  onUpdate: (newValue: string) => void
) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = async (text: string) => {
    if (!text) return;
    setIsLoading(true);
    setError(null);
    try {
      const newSuggestion = await getLlmReflectionSuggestion(text);
      setSuggestion(newSuggestion);
    } catch (err: any) {
      setError(err.message || "Failed to get suggestion.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveSuggestion = () => {
    if (suggestion) {
      onUpdate(suggestion);
    }
    setSuggestion(null);
  };

  const rejectSuggestion = () => {
    setSuggestion(null);
  };

  return {
    suggestion,
    isLoading,
    error,
    fetchSuggestion,
    approveSuggestion,
    rejectSuggestion,
  };
};

interface SelfReflectionComponentProps {
  plan: DailyPlanResponse;
  onSave: (reflection: SelfReflection) => void;
  isSaving: boolean;
}

const SelfReflectionComponent: React.FC<SelfReflectionComponentProps> = ({
  plan,
  onSave,
  isSaving,
}) => {
  const [reflection, setReflection] = useState<SelfReflection>(
    plan.self_reflection || { positive: "", negative: "", follow_up_notes: "" }
  );

  useEffect(() => {
    setReflection(
      plan.self_reflection || {
        positive: "",
        negative: "",
        follow_up_notes: "",
      }
    );
  }, [plan.self_reflection]);

  const handleFieldChange = (field: ReflectionField, value: string) => {
    setReflection((prev) => ({ ...prev, [field]: value }));
  };

  const useLlmHandlers = (field: ReflectionField) => {
    const { fetchSuggestion, ...rest } = useGenericLlmSuggestion(
      reflection[field] || "",
      (newValue) => handleFieldChange(field, newValue)
    );

    const handleImprove = () => {
      const text = reflection[field];
      if (text) {
        fetchSuggestion(text);
      }
    };

    return { handleImprove, ...rest };
  };

  const positiveHandlers = useLlmHandlers("positive");
  const negativeHandlers = useLlmHandlers("negative");
  const followUpHandlers = useLlmHandlers("follow_up_notes");

  const renderField = (
    label: string,
    field: ReflectionField,
    handlers: ReturnType<typeof useLlmHandlers>
  ) => (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label
          htmlFor={field}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlers.handleImprove}
          disabled={handlers.isLoading}
          title={`Improve ${label}`}
        >
          {handlers.isLoading ? (
            <span className="text-xs">Improving...</span>
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Input
        as="textarea"
        id={field}
        value={reflection[field] || ""}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        rows={4}
        placeholder={`What went well?`}
      />
      {handlers.suggestion && (
        <SuggestionBox
          suggestion={handlers.suggestion}
          onApprove={handlers.approveSuggestion}
          onReject={handlers.rejectSuggestion}
        />
      )}
      {handlers.error && (
        <p className="mt-1 text-sm text-red-600">{handlers.error}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderField("What went well?", "positive", positiveHandlers)}
      {renderField("What could be improved?", "negative", negativeHandlers)}
      {renderField(
        "What are your follow-up notes?",
        "follow_up_notes",
        followUpHandlers
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => onSave(reflection)}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Reflection"}
        </Button>
      </div>
    </div>
  );
};

export default SelfReflectionComponent;
