import React from 'react';
import { Clipboard, Plus, Search } from 'lucide-react';
import Button from '../../../components/Button';

const EmptyWodState = ({ canCreate, onCreate, onFindGym }) => (
  <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30 mb-6">
    <div className="bg-slate-800 inline-block p-4 rounded-full mb-4"><Clipboard className="h-8 w-8 text-slate-500" /></div>
    <h3 className="text-xl font-bold text-white mb-1">Nessun WOD</h3>
    <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Riposo o non ancora programmato.</p>
    <div className="flex gap-2 justify-center">{canCreate && <Button onClick={onCreate} variant="secondary"><Plus size={18}/> Aggiungi WOD</Button>}<Button onClick={onFindGym} variant="outline"><Search size={18}/> Trova Palestra</Button></div>
  </div>
);

export default EmptyWodState;
