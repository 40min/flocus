import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import Input from "../components/Input";
import { useMutation } from "@tanstack/react-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../context/AuthContext";
import { User, UserUpdatePayload } from "../types/user";
import { updateUser } from "../services/userService";
import { ApiError } from "../lib/errors";

const preferencesSchema = z.object({
  pomodoro_timeout_minutes: z.coerce.number(),
  pomodoro_long_timeout_minutes: z.coerce.number(),
  pomodoro_working_interval: z.coerce.number(),
  system_notifications_enabled: z.boolean(),
  pomodoro_timer_sound: z.string(),
});

const userSettingsSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  preferences: preferencesSchema,
});

type UserSettingsFormInputs = z.infer<typeof userSettingsSchema>;

const UserSettingsPage: React.FC = () => {
  const { user, login, token } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError: setFormError,
    watch,
  } = useForm<UserSettingsFormInputs>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      password: "",
      preferences: {
        pomodoro_timeout_minutes:
          user?.preferences?.pomodoro_timeout_minutes || 5,
        pomodoro_working_interval:
          user?.preferences?.pomodoro_working_interval || 25,
        system_notifications_enabled:
          user?.preferences?.system_notifications_enabled ?? true,
        pomodoro_long_timeout_minutes:
          user?.preferences?.pomodoro_long_timeout_minutes || 15,
        pomodoro_timer_sound: user?.preferences?.pomodoro_timer_sound || "none",
      },
    },
  });
  const watchedPreferences = watch("preferences");

  const updateUserMutation = useMutation<User, Error, UserUpdatePayload>({
    mutationFn: (payload: UserUpdatePayload) => updateUser(user!.id, payload),
    onSuccess: async () => {
      setSuccessMessage("Account updated successfully!");
      setValue("password", "");
      if (token) await login(token);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      let message = "Failed to update account.";
      if (err instanceof ApiError || err instanceof Error) {
        message = err.message;
      }
      setFormError("root", { type: "manual", message });
    },
  });

  useEffect(() => {
    if (user) {
      setValue("email", user.email || "");
      setValue("first_name", user.first_name || "");
      setValue("last_name", user.last_name || "");
      if (user.preferences) {
        setValue(
          "preferences.pomodoro_long_timeout_minutes",
          user.preferences.pomodoro_long_timeout_minutes
        );
        setValue(
          "preferences.pomodoro_timeout_minutes",
          user.preferences.pomodoro_timeout_minutes
        );
        setValue(
          "preferences.pomodoro_working_interval",
          user.preferences.pomodoro_working_interval
        );
        setValue(
          "preferences.system_notifications_enabled",
          user.preferences.system_notifications_enabled
        );
        setValue(
          "preferences.pomodoro_timer_sound",
          user.preferences.pomodoro_timer_sound || "none"
        );
      }
    } else {
      // If user logs out or becomes null, clear the form.
      setValue("email", "");
      setValue("first_name", "");
      setValue("last_name", "");
    }
  }, [user, setValue]);

  const onSubmit: SubmitHandler<UserSettingsFormInputs> = async (data) => {
    if (!user) return;

    setSuccessMessage(null);
    setFormError("root", { type: "manual", message: "" });

    const updatePayload: UserUpdatePayload = {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      preferences: data.preferences,
    };

    if (data.password && data.password.length > 0) {
      updatePayload.password = data.password;
    }

    updateUserMutation.mutate(updatePayload);
  };

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto ">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
          Settings
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {errors.root && (
          <div
            className="mb-4 p-3 bg-red-100 text-red-700 rounded-md"
            aria-live="assertive"
          >
            {errors.root.message}
          </div>
        )}
        {successMessage && (
          <div
            className="mb-4 p-3 bg-green-100 text-green-700 rounded-md"
            aria-live="assertive"
          >
            {successMessage}
          </div>
        )}

        <section className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-4 border-b border-gray-200">
            Account
          </h2>
          <div className="space-y-6">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="username"
              >
                Username
              </label>
              <Input
                className="bg-gray-200 text-gray-500 cursor-not-allowed"
                id="username"
                name="username"
                type="text"
                value={user.username}
                readOnly
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="email"
              >
                Email
              </label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="first_name"
              >
                First Name
              </label>
              <Input id="first_name" type="text" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="last_name"
              >
                Last Name
              </label>
              <Input id="last_name" type="text" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.last_name.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-2"
                htmlFor="password"
              >
                New Password
              </label>
              <Input
                id="password"
                placeholder="Enter new password (optional)"
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-4 border-b border-gray-200">
            Preferences
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  Pomodoro session duration
                </h3>
              </div>
              <Input
                as="select"
                className="h-11 text-sm w-40"
                aria-label="Pomodoro working interval"
                {...register("preferences.pomodoro_working_interval")}
              >
                <option value={25}>25 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </Input>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  Pomodoro break duration
                </h3>
              </div>
              <Input
                as="select"
                className="h-11 text-sm w-40"
                aria-label="Pomodoro break duration"
                {...register("preferences.pomodoro_timeout_minutes")}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </Input>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  Pomodoro long break duration
                </h3>
              </div>
              <Input
                as="select"
                className="h-11 text-sm w-40"
                aria-label="Pomodoro long break duration"
                {...register("preferences.pomodoro_long_timeout_minutes")}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </Input>
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  Timer Sound
                </h3>
              </div>
              <Input
                as="select"
                className="h-11 text-sm w-40"
                aria-label="Timer Sound"
                {...register("preferences.pomodoro_timer_sound")}
              >
                <option value={"none"}>None</option>
                <option value={"ding.mp3"}>Ding</option>
                <option value={"qpop.mp3"}>Pop</option>
                <option value={"super_mario_coin.mp3"}>Mario Coin</option>
              </Input>
            </div>
            <div className="flex items-center justify-between py-4 ">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  System notifications
                </h3>
                <p className="text-sm text-gray-500">
                  Enable or disable system notifications for timers and tasks.
                </p>
              </div>
              <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-200 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-blue-800">
                <div
                  className="h-full aspect-square rounded-full bg-white transition-transform duration-200 ease-in-out"
                  style={{
                    boxShadow:
                      "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px",
                  }}
                ></div>
                <input
                  className="invisible absolute"
                  type="checkbox"
                  aria-label="System notifications"
                  {...register("preferences.system_notifications_enabled")}
                  checked={watchedPreferences.system_notifications_enabled}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="pt-2 flex justify-end">
          <Button
            variant="slate"
            size="medium"
            type="submit"
            disabled={isSubmitting || updateUserMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateUserMutation.isPending ? "Updating..." : "Update Account"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserSettingsPage;
