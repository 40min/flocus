import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth(); // Get user info from context if needed

  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to the home page{user ? `, ${user.username}!` : '!'}</p>
    </div>
  );
};

export default Home;
