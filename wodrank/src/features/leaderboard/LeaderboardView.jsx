import React from 'react';
import Badge from '../../components/Badge';
import FullLeaderboard from './components/FullLeaderboard';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const LeaderboardView = ({
  leaderboardMode,
  onModeChange,
  wods,
  wodId,
  onWodChange,
  wod,
  scores,
  currentUserId,
  onLike,
  onDeleteScore,
  isAdmin,
  onUserClick,
  attendance,
  typeFilter,
  onTypeFilterChange,
  rxFilter,
  onRxFilterChange,
  onlyMine,
  onToggleOnlyMine,
  userFilter,
  onUserFilterChange,
  attendanceRange,
  onShiftAttendanceRange,
  onAttendanceRangeChange
}) => {
  const typeOptions = [
    { id: 'ALL', label: 'Tutti' },
    { id: 'FORTIME', label: 'For Time' },
    { id: 'AMRAP', label: 'AMRAP' },
    { id: 'WEIGHT', label: 'Weight' },
  ];

  const filteredScores = scores.filter(s => {
    if (userFilter && !s.userName?.toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (rxFilter === 'RX' && !s.rx) return false;
    if (rxFilter === 'SCALED' && s.rx) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
        <button 
          onClick={() => onModeChange('WOD')} 
          className={`flex-1 py-2 text-xs font-bold rounded-md ${leaderboardMode === 'WOD' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
        >
          WOD
        </button>
        <button 
          onClick={() => onModeChange('ATTENDANCE')} 
          className={`flex-1 py-2 text-xs font-bold rounded-md ${leaderboardMode === 'ATTENDANCE' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Costanza
        </button>
      </div>

      {leaderboardMode === 'WOD' ? (
        <>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tipologia</div>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => onTypeFilterChange(opt.id)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md border transition ${typeFilter === opt.id ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Categoria</div>
              <div className="flex flex-wrap gap-2">
                {['ALL','RX','SCALED'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => onRxFilterChange(opt)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md border transition ${rxFilter === opt ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/50'}`}
                  >
                    {opt === 'ALL' ? 'Tutti' : opt}
                  </button>
                ))}
              </div>
              <button
                onClick={onToggleOnlyMine}
                className={`ml-auto px-3 py-1.5 text-[11px] font-bold rounded-md border transition ${onlyMine ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/50'}`}
              >
                Solo i miei
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white flex-1"
                placeholder="Filtra per atleta..."
                value={userFilter}
                onChange={(e) => onUserFilterChange(e.target.value)}
              />
              {userFilter && (
                <button
                  onClick={() => onUserFilterChange('')}
                  className="text-xs px-2 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          {wods.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
              {wods.map(w => (
                <Badge 
                  key={w.id} 
                  color={wodId === w.id ? 'emerald' : 'slate'} 
                  onClick={() => onWodChange(w.id)} 
                  active={wodId === w.id}
                >
                  {w.title}
                </Badge>
              ))}
            </div>
          )}
          {wodId ? (
            <FullLeaderboard 
              wod={wod} 
              scores={filteredScores} 
              currentUserId={currentUserId} 
              onLike={onLike} 
              onDelete={onDeleteScore} 
              isAdmin={isAdmin} 
              onUserClick={onUserClick}
            />
          ) : (
            <div className="text-center text-slate-500 py-10">Nessun WOD.</div>
          )}
        </>
      ) : (
        <div className="space-y-3 pb-20">
          <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 shadow-md">
              <button onClick={() => onShiftAttendanceRange(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Calendar className="w-4 h-4 text-emerald-500 inline-block" />
                <span>
                  {(() => {
                    const label = attendanceRange.start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                    return label.charAt(0).toUpperCase() + label.slice(1);
                  })()}
                </span>
              </div>
              <button onClick={() => onShiftAttendanceRange(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
            </div>
          </div>
          {attendance.map((u, i) => (
            <div key={u.userId} onClick={() => onUserClick(u.userId)} className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="font-black text-lg w-6 text-center text-slate-500">#{i+1}</div>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg overflow-hidden">
                  {u.userAvatar?.startsWith('http') ? <img src={u.userAvatar} className="w-full h-full object-cover"/> : (u.userAvatar || '🙂')}
                </div>
                <div className="font-bold text-white">{u.userName}</div>
              </div>
              <div className="text-2xl font-black text-blue-400">{u.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardView;
