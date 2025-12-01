import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthScreen from './AuthScreen';

// This component now wraps the AuthScreen and manages its state
const AuthFlow = () => {
  const { register, login, socialLogin, resetPassword } = useAuth();
  
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
      if (!email) {
          setError("Per favore, inserisci la tua email per resettare la password.");
          return;
      }
      try {
        await resetPassword(email);
      } catch (err) {
          setError(err.message);
      }
  };

  return (
    <AuthScreen 
      mode={mode}
      setMode={setMode}
      email={email}
      setEmail={setEmail}
      pass={password}
      setPass={setPassword}
      name={fullName}
      setName={setFullName}
      onSubmit={handleSubmit}
      onSocialLogin={socialLogin}
      onResetPassword={handlePasswordReset}
      error={error}
      loading={loading}
    />
  );
};

export default AuthFlow;