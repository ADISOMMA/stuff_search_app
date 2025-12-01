import React from 'react';
import Button from './Button';

const Dialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Conferma", cancelText = "Annulla" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">{cancelText}</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;