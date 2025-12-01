import React from 'react';

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 rounded-xl shadow-lg border border-slate-700/50 ${className}`}>
    {children}
  </div>
);

export default Card;
