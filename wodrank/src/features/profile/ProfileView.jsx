import React, { useState, useMemo } from 'react';
import { LogOut, AlertTriangle, Award, Trophy, Edit3 } from 'lucide-react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { AVATARS, THEMES } from '../../constants';

const ProfileView = ({ currentUser, onSignOut, onDeleteAccount, onUpdateAvatar, trophies, profileForm, onProfileChange, onSaveProfile }) => {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const googleAvatar = currentUser.providerAvatar || currentUser.photoURL || currentUser.googlePhotoURL;
  const avatarOptions = useMemo(() => {
    const list = [...AVATARS];
    if (googleAvatar && !list.includes(googleAvatar)) list.unshift(googleAvatar);
    const currentIsUrl = currentUser.avatar?.startsWith?.('http');
    if (currentIsUrl && !list.includes(currentUser.avatar)) list.unshift(currentUser.avatar);
    return list;
  }, [googleAvatar, currentUser.avatar]);

  const isLightMode = profileForm.theme === 'light';

  return (
    <div className="space-y-6 text-center">
      <div className="relative inline-block">
        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-6xl shadow-2xl overflow-hidden">
          {currentUser.avatar?.startsWith('http') ? <img src={currentUser.avatar} alt="av" className="w-full h-full object-cover"/> : currentUser.avatar}
        </div>
        <button
          className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg hover:bg-emerald-400 transition"
          onClick={() => setShowAvatarPicker(p => !p)}
          title="Cambia avatar"
        >
          <Edit3 size={14} />
        </button>
      </div>
      
      {showAvatarPicker && (
        <div className="grid grid-cols-6 gap-2 max-w-sm mx-auto bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg">
          {avatarOptions.map(av => (
            <button
              key={av}
              onClick={() => { onUpdateAvatar(av); setShowAvatarPicker(false); }}
              className={`h-12 flex items-center justify-center text-2xl rounded-lg border transition ${currentUser.avatar === av ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900 hover:border-emerald-500/60'}`}
            >
              {av.startsWith?.('http')
                ? <img src={av} alt="avatar" className="w-10 h-10 object-cover rounded" />
                : av}
            </button>
          ))}
        </div>
      )}
      
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-xs font-bold text-yellow-500 uppercase mb-3 flex items-center justify-center gap-2">
          <Award size={14}/> Bacheca Trofei
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {trophies.map(t => (
            <div key={t.id} className="w-16 flex flex-col items-center gap-1" title={t.title}>
              <div className="w-10 h-10 bg-yellow-500/10 text-yellow-400 rounded-full flex items-center justify-center border border-yellow-500/30">
                <Trophy size={18}/>
              </div>
              <span className="text-[8px] text-slate-400 truncate w-full text-center">{t.title}</span>
            </div>
          ))}
          {trophies.length === 0 && <span className="text-xs text-slate-500 italic">Nessun trofeo vinto.</span>}
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div>
          <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Nome</label>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
            value={profileForm.name}
            onChange={e => onProfileChange({ ...profileForm, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">Email</label>
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
            value={profileForm.email}
            onChange={e => onProfileChange({ ...profileForm, email: e.target.value })}
          />
        </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Tema</label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => onProfileChange({ ...profileForm, theme: t.id })}
                className={`p-3 rounded-lg border text-left transition ${profileForm.theme === t.id ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/40'}`}
              >
                <div className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{t.name}</div>
                <div className={`text-[11px] ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>Classe: {t.className}</div>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onSaveProfile} className="w-full">Salva Profilo</Button>
      </div>

      <div className="flex justify-center gap-2 mt-2">
        <Badge color="purple">{currentUser.globalRole}</Badge>
        <Badge color="blue">{currentUser.email}</Badge>
      </div>

      <Button variant="outline" onClick={onSignOut} className="w-full max-w-xs mx-auto">
        <LogOut size={18} /> Disconnetti
      </Button>

      <div className="pt-4 border-t border-slate-800 mt-6">
        <button onClick={onDeleteAccount} className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 text-xs mx-auto p-2 hover:bg-red-900/20 rounded transition">
          <AlertTriangle size={12}/> Elimina Account
        </button>
      </div>
    </div>
  );
};

export default ProfileView;
