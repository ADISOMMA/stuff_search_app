import React from 'react';
import { Shield, Check, Ban, Trash2, Settings } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';

const AdminView = ({ allUsers, gyms, onToggleBlockUser, onChangeGlobalRole, onManageGym, onDeleteGym, onEditUser, onDeleteUser }) => {
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-2 mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
        <Shield className="text-purple-400 w-10 h-10" />
        <div>
          <h2 className="text-xl font-black text-white">Super Admin</h2>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3">Utenti ({allUsers.length})</h3>
        <div className="space-y-4">
          {allUsers.map(u => (
            <Card key={u.id} className="p-4 border-slate-700 bg-slate-800/50">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl overflow-hidden border border-slate-600">
                    {u.avatar?.startsWith('http') ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-white flex items-center gap-2 ${u.blocked ? 'line-through text-red-400' : ''}`}>
                      <span className="truncate block max-w-[180px]">{u.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate max-w-[220px]">{u.email}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-end self-end flex-shrink-0">
                  <button
                    onClick={() => onChangeGlobalRole(u.id, u.globalRole === 'admin' ? 'user' : 'admin')}
                    className={`p-2 rounded-lg border transition ${u.globalRole === 'admin' ? 'bg-purple-700/30 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    title="Toggle Admin"
                  >
                    <Shield size={16}/>
                  </button>
                  <button
                    onClick={() => onEditUser(u)}
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
                    title="Modifica profilo"
                  >
                    <Settings size={16}/>
                  </button>
                  <button
                    onClick={() => onToggleBlockUser(u.id, u.blocked)}
                    className={`p-2 rounded-lg transition ${u.blocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                    title="Blocca/Sblocca"
                  >
                    {u.blocked ? <Check size={16}/> : <Ban size={16}/>}
                  </button>
                  <button
                    onClick={() => onDeleteUser(u.id)}
                    className="p-2 rounded-lg bg-red-900/20 border border-red-600 text-red-400 hover:bg-red-800/30"
                    title="Elimina utente"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">Palestre ({gyms.length})</h3>
        <div className="space-y-3">
          {gyms.map(g => (
            <Card key={g.id} className="p-4 border-slate-700 bg-slate-800/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{g.name}</div>
                <div className="text-xs text-slate-500">{g.members?.length || 0} membri</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onManageGym(g)}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
                  title="Gestisci palestra"
                >
                  <Settings size={16}/>
                </button>
                <button
                  onClick={() => onDeleteGym(g)}
                  className="p-2 rounded-lg bg-red-900/20 border border-red-600 text-red-400 hover:bg-red-800/30"
                  title="Elimina palestra"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminView;
