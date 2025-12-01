import React, { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../../utils/date.js';

const DateNavigator = ({ date, setDate }) => {
  const dateInputRef = useRef(null);
  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    setDate(new Date(y, m - 1, d));
  };

  return (
    <div className="flex items-center justify-between bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-md mb-4 relative z-0">
      <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d); }} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white z-10 relative"><ChevronLeft/></button>
      <div 
        className="flex items-center gap-2 font-bold text-lg relative group cursor-pointer"
        onClick={() => {
          try {
            if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
               dateInputRef.current.showPicker();
            } else {
               dateInputRef.current?.focus();
            }
          } catch (e) { console.log(e); }
        }}
      >
        <Calendar className="w-5 h-5 text-emerald-500 mb-0.5" />
        <span className="group-hover:text-emerald-400 transition-colors">{date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
        <input ref={dateInputRef} type="date" value={formatDate(date)} onChange={handleDateChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20" />
      </div>
      <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d); }} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white z-10 relative"><ChevronRight/></button>
    </div>
  );
};

export default DateNavigator;
