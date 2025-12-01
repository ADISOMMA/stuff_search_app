import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, size='md', type = "button" }) => {
  const sizes = { xs: "px-2 py-1 text-[10px]", sm: "px-3 py-2 text-xs", md: "px-4 py-3", lg: "px-6 py-4 text-lg" };
  const baseStyle = `${sizes[size]} rounded-lg font-bold transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shrink-0`;
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    ghost: "text-slate-400 hover:text-white",
    outline: "border border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-500",
    google: "bg-white text-slate-800 hover:bg-slate-100 border border-slate-300",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export default Button;