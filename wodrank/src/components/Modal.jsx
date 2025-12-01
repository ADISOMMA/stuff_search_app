import React from 'react';
import { X } from 'lucide-react';
import Card from './Card';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
    <Card className="w-full max-w-md flex flex-col max-h-[90vh]">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
    </Card>
  </div>
);

export default Modal;