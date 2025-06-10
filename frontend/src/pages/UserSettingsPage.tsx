import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useMutation } from '@tanstack/react-query';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { User, UserUpdatePayload } from '../types/user';
import { updateUser } from '../services/userService';
import { AxiosError } from 'axios';

interface UserSettingsFormInputs {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
}

const UserSettingsPage: React.FC = () => {
  const { user, login, token } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors }, setError: setFormError } = useForm<UserSettingsFormInputs>();

  const updateUserMutation = useMutation<User, Error, UserUpdatePayload>({
    mutationFn: (payload: UserUpdatePayload) => updateUser(user!.id, payload),
    onSuccess: async () => {
      setSuccessMessage('Account updated successfully!');
      setValue('password', '');
      if (token) {
        await login(token);
      }
    },
    onError: (err) => {
      let message = 'Failed to update account.';
      if (err instanceof AxiosError) {
        message = err.response?.data?.detail || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setFormError('root', { type: 'manual', message });
    },
  });

  // Preferences state (UI only for now)
  const [darkMode, setDarkMode] = useState(false);
  const [defaultView, setDefaultView] = useState('List View');
  const [pomodoroDuration, setPomodoroDuration] = useState('25 minutes');
  const [notificationSound, setNotificationSound] = useState('Default');

  useEffect(() => {
    if (user) {
      setValue('email', user.email || '');
      setValue('first_name', user.first_name || '');
      setValue('last_name', user.last_name || '');
    }
  }, [user, setValue]);

  const onSubmit: SubmitHandler<UserSettingsFormInputs> = async (data) => {
    if (!user) return;

    setSuccessMessage(null);
    setFormError('root', { type: 'manual', message: '' });

    const updatePayload: UserUpdatePayload = {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
    };

    if (data.password) {
      updatePayload.password = data.password;
    }

    updateUserMutation.mutate(updatePayload);
  };

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Settings</h1>
      </header>

      {errors.root && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md" aria-live="assertive">{errors.root.message}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md" aria-live="assertive">{successMessage}</div>}

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-200">Account</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">Username</label>
            <Input className="bg-gray-200 text-gray-500 cursor-not-allowed" id="username" name="username" type="text" value={user.username} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <Input id="email" type="email" {...register('email', { required: 'Email is required' })} />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="first_name">First Name</label>
            <Input id="first_name" type="text" {...register('first_name', { required: 'First name is required' })} />
            {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="last_name">Last Name</label>
            <Input id="last_name" type="text" {...register('last_name', { required: 'Last name is required' })} />
            {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">New Password</label>
            <Input id="password" placeholder="Enter new password (optional)" type="password" {...register('password')} />
          </div>
          <div className="pt-2">
            <Button variant="slate" size="medium" type="submit" disabled={updateUserMutation.isPending} className="flex items-center gap-2">
              {updateUserMutation.isPending ? 'Updating...' : 'Update Account'}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-200">Preferences</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div>
              <h3 className="text-base font-medium text-gray-800">Dark Mode</h3>
              <p className="text-sm text-gray-500">Enable or disable dark mode for the application interface.</p>
            </div>
            <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-200 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-[#a5b4fc]">
              <div className="h-full aspect-square rounded-full bg-white transition-transform duration-200 ease-in-out" style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px' }}></div>
              <input className="invisible absolute" type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div>
              <h3 className="text-base font-medium text-gray-800">Default View</h3>
              <p className="text-sm text-gray-500">Choose the default view for your daily schedule.</p>
            </div>
            <Input as="select" className="h-11 text-sm w-40" value={defaultView} onChange={(e) => setDefaultView(e.target.value)}>
              <option>List View</option>
              <option>Calendar View</option>
              <option>Board View</option>
            </Input>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div>
              <h3 className="text-base font-medium text-gray-800">Pomodoro Duration</h3>
              <p className="text-sm text-gray-500">Set the default duration for your Pomodoro sessions.</p>
            </div>
            <Input as="select" className="h-11 text-sm w-40" value={pomodoroDuration} onChange={(e) => setPomodoroDuration(e.target.value)}>
              <option>25 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
            </Input>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-base font-medium text-gray-800">Notification Sound</h3>
              <p className="text-sm text-gray-500">Choose the default sound for notifications.</p>
            </div>
            <Input as="select" className="h-11 text-sm w-40" value={notificationSound} onChange={(e) => setNotificationSound(e.target.value)}>
              <option>Default</option>
              <option>Chime</option>
              <option>Alert</option>
              <option>None</option>
            </Input>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserSettingsPage;
