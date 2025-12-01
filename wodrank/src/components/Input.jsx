import React from 'react';

const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
    <input required className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-colors" {...props} />
  </div>
);

export default Input;