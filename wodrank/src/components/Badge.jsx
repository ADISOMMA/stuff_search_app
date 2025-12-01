import React from 'react';

const Badge = ({ children, color = 'slate', onClick, active }) => {
  const colors = { 
    slate: 'bg-slate-700 text-slate-300', emerald: 'bg-emerald-500/20 text-emerald-400', 
    blue: 'bg-blue-500/20 text-blue-400', purple: 'bg-purple-500/20 text-purple-400', 
    orange: 'bg-orange-500/20 text-orange-400', red: 'bg-red-500/20 text-red-400', 
    yellow: 'bg-yellow-500/20 text-yellow-400' 
  };
  const activeStyle = active ? "border-emerald-500 bg-emerald-500/10 text-emerald-100" : "";
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center leading-none px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-default whitespace-nowrap border border-transparent ${colors[color] || colors.slate} ${activeStyle} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </span>
  );
};

export default Badge;
