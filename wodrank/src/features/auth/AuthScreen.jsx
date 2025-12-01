import React from 'react';
import { Flame, User, Mail, Lock } from 'lucide-react';
import { GoogleAuthProvider } from 'firebase/auth';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';

const AuthScreen = ({ mode, setMode, email, setEmail, pass, setPass, name, setName, onSubmit, onSocialLogin, onResetPassword, error, loading }) => (
  <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
    <div className="z-10 w-full max-w-md">
      <div className="text-center mb-8">
        <Flame className="w-16 h-16 text-emerald-500 mx-auto mb-2 animate-bounce" />
        <h1 className="text-5xl font-black tracking-tighter italic mb-1">WOD<span className="text-emerald-500">RANK</span></h1>
        <p className="text-slate-400">La piattaforma per la competizione reale.</p>
      </div>
      <Card className="p-8 backdrop-blur-xl bg-slate-800/80 border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">{mode === 'login' ? 'Accedi' : 'Crea Account'}</h2>
        <div className="grid grid-cols-1 gap-3 mb-6">
          <Button variant="google" onClick={() => onSocialLogin(new GoogleAuthProvider())}>Continua con Google</Button>
        </div>
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">Oppure con email</span></div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && <Input icon={User} placeholder="Nome Atleta" value={name} onChange={e => setName(e.target.value)} />}
          <Input icon={Mail} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input icon={Lock} type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
          {mode === 'login' && <div className="text-right mt-1"><button type="button" onClick={onResetPassword} className="text-xs text-emerald-400 hover:text-emerald-300 transition">Password dimenticata?</button></div>}
          {error && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded text-center">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full mt-2">{loading ? '...' : mode === 'login' ? 'Entra' : 'Registrati'}</Button>
        </form>
        <div className="text-center mt-6 pt-6 border-t border-slate-700">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-slate-400 text-sm hover:text-white transition">{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button>
        </div>
      </Card>
    </div>
  </div>
);

export default AuthScreen;