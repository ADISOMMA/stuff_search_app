import React from 'react';

const TimeInput = ({ minutes, setMinutes, seconds, setSeconds }) => (
  <div className="flex items-center gap-2 justify-center">
    <div className="flex-1"><label className="block text-xs text-slate-400 text-center mb-1 font-bold uppercase">Minuti</label><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-2xl font-mono text-white text-center appearance-none focus:border-emerald-500 outline-none">{[...Array(61).keys()].map(i => <option key={`m-${i}`} value={i}>{i.toString().padStart(2, '0')}</option>)}</select></div>
    <div className="text-2xl font-bold text-slate-500 mt-6">:</div>
    <div className="flex-1"><label className="block text-xs text-slate-400 text-center mb-1 font-bold uppercase">Secondi</label><select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-2xl font-mono text-white text-center appearance-none focus:border-emerald-500 outline-none">{[...Array(60).keys()].map(i => <option key={`s-${i}`} value={i}>{i.toString().padStart(2, '0')}</option>)}</select></div>
  </div>
);

export default TimeInput;
