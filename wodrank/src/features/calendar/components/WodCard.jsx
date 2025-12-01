import React from 'react';
import { Dumbbell, Edit3, Trash2, Plus } from 'lucide-react';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';

const WodCard = ({ wod, onLog, isAdmin, onDelete, onEdit }) => (
  <Card className="overflow-hidden border-0 relative group mb-6">
    {isAdmin && (
      <div className="absolute top-2 right-2 flex gap-2 z-20">
        <button onClick={onEdit} className="p-2 bg-black/40 hover:bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><Edit3 size={16}/></button>
        <button onClick={onDelete} className="p-2 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
      </div>
    )}
    <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 relative overflow-hidden">
      <Dumbbell size={100} className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 text-white" />
      <div className="relative z-10">
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tight shadow-black drop-shadow-md">{wod.title}</h2>
        <div className="flex gap-2 mt-3"><Badge color="white" className="bg-white/20 text-white border border-white/20">{wod.type}</Badge>{wod.timeCap && <Badge color="white" className="bg-white/20 text-white border border-white/20">TC: {wod.timeCap}'</Badge>}</div>
      </div>
    </div>
    <div className="p-6 bg-slate-800">
      <pre className="font-mono text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{wod.description}</pre>
      <div className="mt-4 text-xs text-slate-500 text-right">Creato da: {wod.createdBy || 'Coach'}</div>
    </div>
    <div className="p-4 bg-slate-800 border-t border-slate-700"><Button onClick={onLog} className="w-full shadow-emerald-900/20"><Plus size={20}/> Registra Score</Button></div>
  </Card>
);

export default WodCard;
