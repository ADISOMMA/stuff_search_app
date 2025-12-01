import React from 'react';
import { Swords, Plus, Clock } from 'lucide-react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';

const ChallengesView = ({ 
  myChallenges, 
  currentUser, 
  onCreate, 
  onAccept, 
  onDecline, 
  onDeclareWinner,
  getChallengeLeaderboard 
}) => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Swords className="text-yellow-500"/>
          <h2 className="text-xl font-bold text-white">Sfide</h2>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus size={16}/> Lancia
        </Button>
      </div>

      {myChallenges.pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inviti</h3>
          {myChallenges.pending.map(c => (
            <div key={c.id} className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-white">{c.title}</div>
                  <div className="text-xs text-slate-400">Da: {c.creatorName}</div>
                </div>
                <Badge color="yellow">Invito</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => onAccept(c.id)} className="flex-1">Accetta</Button>
                <Button size="sm" variant="secondary" onClick={() => onDecline(c.id)} className="flex-1">Rifiuta</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attive</h3>
        {myChallenges.active.map(c => { 
          const lb = getChallengeLeaderboard(c); 
          return (
            <Card key={c.id} className="p-4">
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-white text-lg">{c.title}</div>
                  {c.rxOnly && <Badge color="red">RX Only</Badge>}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={12}/> {c.endDate}</span>
                  <span>{c.creatorName}</span>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 space-y-1">
                {lb.map((u, i) => (
                  <div key={u.uid} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono w-4">{i+1}</span>
                      <span className="text-slate-200">{u.uid === currentUser.uid ? 'Tu' : u.name}</span>
                    </div>
                    <span className="font-bold text-emerald-400">{u.score}</span>
                  </div>
                ))}
              </div>
              {c.creatorId === currentUser.uid && (
                <div className="mt-3 text-center">
                  <button onClick={() => onDeclareWinner(c.id, lb[0]?.uid)} className="text-xs text-slate-500 hover:text-white underline">
                    Termina
                  </button>
                </div>
              )}
            </Card>
          );
        })}
        {myChallenges.active.length === 0 && <div className="text-center py-4 text-slate-500 text-sm">Nessuna sfida attiva.</div>}
      </div>
    </div>
  );
};

export default ChallengesView;