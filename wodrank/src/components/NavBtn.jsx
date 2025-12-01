import React from 'react';

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-16 ${active ? 'text-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
    <Icon size={20} className={active ? "fill-current opacity-20" : ""} strokeWidth={active? 2.5 : 2} />
    <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
  </button>
);

export default NavBtn;