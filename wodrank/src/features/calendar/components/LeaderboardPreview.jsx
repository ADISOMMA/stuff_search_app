import React from 'react';

const LeaderboardPreview = ({ scores, onMore }) => (
  <div className="border border-slate-700 rounded-xl bg-slate-800 p-4">
    <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Top 3 Live</h3><button onClick={onMore} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">Classifica</button></div>
    <div className="space-y-2">
      {scores.slice(0, 3).map((s) => (
        <div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-slate-700/30">
          <div className="flex items-center gap-3 flex-1 min-w-0"><span className={`font-bold w-4 text-center flex-shrink-0 ${s.rank===1?'text-yellow-400':'text-slate-500'}`}>{s.rank}</span><span className="text-slate-200 font-medium truncate">{s.userName}</span></div>
          <div className="font-mono font-bold text-emerald-400 flex-shrink-0 ml-2">{s.resultDisplay}</div>
        </div>
      ))}
      {scores.length === 0 && <div className="text-center text-slate-500 text-xs italic">Nessuno score registrato.</div>}
    </div>
  </div>
);

export default LeaderboardPreview;
