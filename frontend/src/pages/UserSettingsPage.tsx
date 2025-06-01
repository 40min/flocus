import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserUpdatePayload } from '../types/user';
import { AxiosError } from 'axios';

const UserSettingsPage: React.FC = () => {
  const { user, login, token } = useAuth(); // Assuming login updates the user context after successful update
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preferences state (UI only for now)
  const [darkMode, setDarkMode] = useState(false);
  const [defaultView, setDefaultView] = useState('List View');
  const [pomodoroDuration, setPomodoroDuration] = useState('25 minutes');
  const [notificationSound, setNotificationSound] = useState('Default');

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '', // Password should not be pre-filled
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const updatePayload: UserUpdatePayload = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
    };

    if (formData.password) {
      updatePayload.password = formData.password;
    }

    try {
      // The backend should return the updated user object or a success response.
      // If the token needs to be refreshed upon email/password change, that logic should be handled.
      // For now, we'll optimistically update the local user state or re-fetch.
      // A simple way is to call login again if it re-fetches user data, using the token from AuthContext.
      if (token) {
        await login(token); // This re-fetches user data using the current auth token
      }
      setSuccessMessage('Account updated successfully!');
      setFormData(prev => ({ ...prev, password: '' })); // Clear password field
    } catch (err) {
      let message = 'Failed to update account.';
      if (err instanceof AxiosError) {
        message = err.response?.data?.detail || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Settings</h1>
      </header>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-200">Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">Username</label>
            <input className="form-input w-full h-12 bg-gray-200 text-gray-500 cursor-not-allowed" id="username" name="username" type="text" value={user.username} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input className="form-input w-full h-12" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="first_name">First Name</label>
            <input className="form-input w-full h-12" id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} required />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="last_name">Last Name</label>
            <input className="form-input w-full h-12" id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">New Password</label>
            <input className="form-input w-full h-12" id="password" name="password" placeholder="Enter new password (optional)" type="password" value={formData.password} onChange={handleChange} />
          </div>
          <div className="pt-2">
            <button className="btn-primary h-12 px-6 text-base" type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Account'}
            </button>
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
            <select className="form-input h-11 text-sm w-40" value={defaultView} onChange={(e) => setDefaultView(e.target.value)}>
              <option>List View</option>
              <option>Calendar View</option>
              <option>Board View</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div>
              <h3 className="text-base font-medium text-gray-800">Pomodoro Duration</h3>
              <p className="text-sm text-gray-500">Set the default duration for your Pomodoro sessions.</p>
            </div>
            <select className="form-input h-11 text-sm w-40" value={pomodoroDuration} onChange={(e) => setPomodoroDuration(e.target.value)}>
              <option>25 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-base font-medium text-gray-800">Notification Sound</h3>
              <p className="text-sm text-gray-500">Choose the default sound for notifications.</p>
            </div>
            <select className="form-input h-11 text-sm w-40" value={notificationSound} onChange={(e) => setNotificationSound(e.target.value)}>
              <option>Default</option>
              <option>Chime</option>
              <option>Alert</option>
              <option>None</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserSettingsPage;
