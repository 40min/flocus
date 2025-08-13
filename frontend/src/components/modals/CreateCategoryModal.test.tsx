import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreateCategoryModal from "./CreateCategoryModal";
import * as categoryService from "services/categoryService";
import { Category } from "types/category";
import { ApiError } from "../../errors/errors";

// Mocks
jest.mock("services/categoryService");
const mockedCreateCategory = categoryService.createCategory as jest.Mock;
const mockedUpdateCategory = categoryService.updateCategory as jest.Mock;

const queryClient = new QueryClient();

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockEditingCategory: Category = {
  id: "1",
  name: "Work",
  description: "Work related tasks",
  color: "#3B82F6",
  user_id: "user1",
  is_deleted: false,
};

const renderModal = (
  props: Partial<React.ComponentProps<typeof CreateCategoryModal>>
) => {
  const defaultProps: React.ComponentProps<typeof CreateCategoryModal> = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmitSuccess: jest.fn(),
    editingCategory: null,
    ...props,
  };

  return render(
    <AllTheProviders>
      <CreateCategoryModal {...defaultProps} />
    </AllTheProviders>
  );
};

describe("CreateCategoryModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Create New Category" title when not editing', () => {
    renderModal({});
    expect(screen.getByText("Create New Category")).toBeInTheDocument();
  });

  it('renders "Edit Category" title and populates form when editing', () => {
    renderModal({ editingCategory: mockEditingCategory });
    expect(screen.getByText("Edit Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue(mockEditingCategory.name);
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      mockEditingCategory.description
    );
    expect(screen.getByTitle("Blue")).toHaveClass("ring-2");
  });

  it("handles form submission for creating a new category", async () => {
    const onSubmitSuccess = jest.fn();
    const onClose = jest.fn();
    mockedCreateCategory.mockResolvedValueOnce({} as Category);
    renderModal({ onSubmitSuccess, onClose });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Category" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "New Desc" },
    });
    fireEvent.click(screen.getByTitle("Green"));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockedCreateCategory).toHaveBeenCalledWith({
        name: "New Category",
        description: "New Desc",
        color: "#22C55E",
      });
    });

    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles form submission for updating an existing category", async () => {
    const onSubmitSuccess = jest.fn();
    const onClose = jest.fn();
    mockedUpdateCategory.mockResolvedValueOnce({} as Category);
    renderModal({
      editingCategory: mockEditingCategory,
      onSubmitSuccess,
      onClose,
    });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated Work" },
    });
    fireEvent.click(screen.getByTitle("Red"));

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mockedUpdateCategory).toHaveBeenCalledWith("1", {
        name: "Updated Work",
        description: "Work related tasks",
        color: "#EF4444",
      });
    });

    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays validation error for missing name", async () => {
    renderModal({});
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(mockedCreateCategory).not.toHaveBeenCalled();
  });

  it("displays API error on create failure", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockedCreateCategory.mockRejectedValueOnce(
      new ApiError("Category name already exists", 409)
    );
    renderModal({});

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Duplicate" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByText("Category name already exists")
    ).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
