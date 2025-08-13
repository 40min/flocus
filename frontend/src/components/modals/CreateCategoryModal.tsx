import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from "types/category";
import { ApiError } from "../../errors/errors";
import * as categoryService from "services/categoryService";
import { Button } from "@/components/ui/button";
import Input from "../Input";
import Modal from "./Modal";

import { colorOptions } from "constants/colors";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string({ required_error: "Color is required" }),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  editingCategory: Category | null;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  editingCategory,
}) => {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
  });

  const watchedColor = watch("color");

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (editingCategory) {
        reset({
          name: editingCategory.name,
          description: editingCategory.description || "",
          color: editingCategory.color || colorOptions[0].value,
        });
      } else {
        reset({ name: "", description: "", color: colorOptions[0].value });
      }
    }
  }, [editingCategory, isOpen, reset]);

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setFormError(null);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(
          editingCategory.id,
          data as CategoryUpdateRequest
        );
      } else {
        await categoryService.createCategory(data as CategoryCreateRequest);
      }
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : editingCategory
          ? "Failed to update category."
          : "Failed to create category."
      );
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? "Edit Category" : "Create New Category"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Name
          </label>
          <Input type="text" id="name" {...register("name")} />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description (Optional)
          </label>
          <Input
            as="textarea"
            id="description"
            {...register("description")}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Color
          </label>
          <input type="hidden" {...register("color")} />
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setValue("color", option.value, { shouldValidate: true })
                }
                className={`h-8 w-8 rounded-full ${option.bgColor} ${
                  watchedColor === option.value
                    ? `ring-2 ${option.ringColor} ring-offset-2`
                    : ""
                }`}
                title={option.name}
              />
            ))}
          </div>
          {errors.color && (
            <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
          )}
        </div>
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            size="medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="slate"
            size="medium"
          >
            {isSubmitting ? "Saving..." : editingCategory ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCategoryModal;
