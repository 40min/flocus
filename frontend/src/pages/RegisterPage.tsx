import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import Input from "../components/Input";
import * as z from "zod";
import { registerUser } from "../services/authService";
import { ApiError } from "../lib/errors";
import { RetroGrid } from "../components/magicui/RetroGrid";
import { AxiosError } from "axios";

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});

type UserRegistrationData = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserRegistrationData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<UserRegistrationData> = async (data) => {
    setError(null);
    setSuccessMessage(null);

    interface FastAPIErrorDetail {
      loc: string[];
      msg: string;
    }

    try {
      await registerUser(data);
      setSuccessMessage("Registration successful! Please log in.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      let errorMessage = "Registration failed. Please try again.";
      if (err instanceof AxiosError) {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail
            .map((errorItem: FastAPIErrorDetail) => {
              const field =
                errorItem.loc && errorItem.loc.length > 1
                  ? errorItem.loc[errorItem.loc.length - 1]
                  : "Validation";
              return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${
                errorItem.msg
              }`;
            })
            .join(". ");
          if (!errorMessage.trim()) {
            errorMessage = "Multiple validation errors occurred.";
          }
        } else if (typeof detail === "string") {
          errorMessage = detail;
        } else if (err.message) {
          // Fallback to Axios error message
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      if (err instanceof AxiosError && err.response?.data) {
      }
    }
  };

  return (
    <div className="relative flex flex-col flex-grow h-screen w-full items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl">
      <RetroGrid />
      {/* Ensure the form is on top and centered */}
      <div className="z-10 max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join us to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <Input
                id="username"
                type="text"
                {...register("username")}
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="text-red-500 text-sm">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <Input
                id="first_name"
                type="text"
                {...register("first_name")}
                placeholder="Enter your first name"
              />
              {errors.first_name && (
                <p className="text-red-500 text-sm">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <Input
                id="last_name"
                type="text"
                {...register("last_name")}
                placeholder="Enter your last name"
              />
              {errors.last_name && (
                <p className="text-red-500 text-sm">
                  {errors.last_name.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="Choose a strong password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4" aria-live="assertive">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-50 p-4" aria-live="assertive">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {successMessage}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="slate"
              className="w-full"
            >
              {isSubmitting ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-center mt-6">
          <div className="text-sm">
            <Link
              to="/login"
              className="font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              Already have an account? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
