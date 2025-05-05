import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers } from '../services/userService';

// TODO: Define a proper User type/interface matching the backend model
interface User {
  id: string;
  username: string;
  // Add other fields from your backend User model
}

const Home: React.FC = () => {
  const { user } = useAuth(); // Get user info from context if needed
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        setError('Failed to fetch users. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to the home page{user ? `, ${user.username}!` : '!'}</p>

      <h2>User List (Example Fetch)</h2>
      {isLoading && <p>Loading users...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && !error && (
        <ul>
          {users.length > 0 ? (
            users.map((u) => (
              <li key={u.id}>{u.username} (ID: {u.id})</li>
            ))
          ) : (
            <li>No users found.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Home;