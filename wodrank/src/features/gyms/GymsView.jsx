import React from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import Button from '../../components/Button';

const GymsView = ({ myGyms, allGyms, currentGym, currentUser, onSelectGym, onCreateGym, onJoinGym, canManageGym, onManageGym, onDeleteGym }) => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Palestre</h2>
        <Button size="sm" onClick={onCreateGym}>
          <Plus size={16}/> Crea
        </Button>
      </div>
      <div className="grid gap-3">
        {myGyms.map(g => (
          <div 
            key={g.id} 
            className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-2 transition ${currentGym?.id === g.id ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-800 border-slate-700'}`} 
            onClick={() => onSelectGym(g)}
          >
            <div className="flex justify-between items-center w-full">
              <div>
                <div className="font-bold text-lg text-white">{g.name}</div>
                <div className="text-xs text-slate-400">{g.members?.length} Membri</div>
              </div>
              <div className="flex items-center gap-2">
                {canManageGym?.(g) && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onManageGym(g); }}
                      className="p-2 rounded-full bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600"
                      title="Gestisci membri"
                    >
                      <Settings size={16}/>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteGym(g); }}
                      className="p-2 rounded-full bg-red-900/20 text-red-400 hover:bg-red-800/30 border border-red-600"
                      title="Elimina palestra"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {myGyms.length === 0 && <div className="text-center py-4 text-slate-500 text-sm">Nessuna iscrizione.</div>}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Tutte le Palestre</h3>
        <div className="space-y-2">
          {allGyms.filter(g => !g.members?.includes(currentUser.uid)).map(g => (
            <div key={g.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center">
              <div className="font-bold text-slate-300">{g.name}</div>
              <Button size="sm" variant="outline" onClick={() => onJoinGym(g.id)}>
                Unisciti
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GymsView;
