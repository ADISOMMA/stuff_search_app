import React from 'react';
import { Plus } from 'lucide-react';
import backSquatIcon from '../../assets/benchmarks/back_squat.svg';
import frontSquatIcon from '../../assets/benchmarks/front_squat.svg';
import deadliftIcon from '../../assets/benchmarks/deadlift.svg';
import benchIcon from '../../assets/benchmarks/bench.svg';
import snatchIcon from '../../assets/benchmarks/snatch.svg';
import cleanIcon from '../../assets/benchmarks/clean.svg';

const ICON_MAP = {
  back_squat: backSquatIcon,
  front_squat: frontSquatIcon,
  deadlift: deadliftIcon,
  bench: benchIcon,
  snatch: snatchIcon,
  clean: cleanIcon,
};

const BenchmarksView = ({ 
  benchmarkTab, 
  onTabChange, 
  benchmarksData, 
  getMyPR, 
  onOpenBenchmark
}) => {
  return (
    <div className="space-y-6">
      <div className="flex bg-slate-800 p-1 rounded-lg">
        {['LIFTS', 'GIRLS', 'HEROES'].map(c => (
          <button 
            key={c} 
            onClick={() => onTabChange(c)} 
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${benchmarkTab === c ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-3 pb-16">
        {benchmarksData[benchmarkTab].map(b => {
          const pr = getMyPR(b.id); 
          return (
            <div 
              key={b.id} 
              onClick={() => onOpenBenchmark(b)} 
              className="bg-slate-800 p-4 rounded-xl border border-slate-700 cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {ICON_MAP[b.icon] ? (
                    <img
                      src={ICON_MAP[b.icon]}
                      alt={b.title}
                      className="w-8 h-8 benchmark-icon"
                    />
                  ) : (
                    <span className="text-2xl">{b.icon}</span>
                  )}
                  <div>
                    <div className="font-bold text-white">{b.title}</div>
                  </div>
                </div>
                {pr ? (
                  <div className="text-right">
                    <div className="text-xs text-emerald-500 font-bold">PR</div>
                    <div className="text-xl font-black text-white font-mono">{pr.resultDisplay}</div>
                  </div>
                ) : (
                  <Plus className="text-slate-500"/>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BenchmarksView;
