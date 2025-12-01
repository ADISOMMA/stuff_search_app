import React from 'react';
import { Trash2, ThumbsUp } from 'lucide-react';
import Badge from '../../../components/Badge';

const FullLeaderboard = ({ wod, scores, currentUserId, onLike, onDelete, isAdmin, onUserClick }) => (
  <div className="space-y-3 pb-20">
    <div className="flex justify-between items-end mb-4 px-2"><h2 className="text-2xl font-black italic text-white uppercase tracking-tight">{wod ? wod.title : 'Generale'}</h2><Badge>{scores.length} Atleti</Badge></div>
    {scores.map((score, idx) => (
      <div key={score.id} className={`p-4 rounded-xl relative overflow-hidden border group ${score.userId === currentUserId ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>
        {(isAdmin || score.userId === currentUserId) && (
          <div className="absolute bottom-3 left-14 flex items-center gap-1 z-20">
            <button
              onClick={() => onDelete(score.id)}
              className="p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-red-300 hover:bg-slate-800 transition border border-slate-700"
              title="Elimina score"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        )}
        {idx < 3 && <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden"><div className={`absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-16 h-16 rotate-45 ${idx===0?'bg-yellow-500':idx===1?'bg-slate-400':'bg-orange-600'} z-10`}></div><span className="absolute top-1 right-1 text-[10px] font-bold text-slate-900 z-20">#{idx+1}</span></div>}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl border border-slate-600 shadow-inner overflow-hidden cursor-pointer" onClick={() => onUserClick(score.userId)}>{score.userAvatar?.startsWith('http') ? <img src={score.userAvatar} className="w-full h-full object-cover"/> : (score.userAvatar || '🙂')}</div>
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start">
              <div><div className="font-bold text-slate-100 text-lg leading-none mb-1 truncate cursor-pointer hover:text-emerald-400 transition" onClick={() => onUserClick(score.userId)}>{score.userName}</div><div className="flex gap-2 items-center"><Badge color={score.rx ? 'emerald' : 'orange'}>{score.rx ? 'Rx' : 'Scaled'}</Badge></div></div>
              <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight pl-2 pr-4 shrink-0">{score.resultDisplay}</div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">{score.note ? <span className="text-xs text-slate-500 italic truncate max-w-[150px]">"{score.note}"</span> : <span/>}<button onClick={() => onLike(score.id, score.likes)} className={`flex items-center gap-1.5 text-xs font-bold transition ${score.likes > 0 ? 'text-blue-400' : 'text-slate-500'}`}><ThumbsUp size={14} className={score.likes?"fill-current":""}/> {score.likes || 'Fist Bump'}</button></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default FullLeaderboard;
