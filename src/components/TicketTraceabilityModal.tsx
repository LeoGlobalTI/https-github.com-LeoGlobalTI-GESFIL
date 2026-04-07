
import React from 'react';
import { Ticket, TicketStatus, Service, Station } from '@/types';

interface TicketTraceabilityModalProps {
  ticket: Ticket;
  service?: Service;
  station?: Station;
  onClose: () => void;
}

const TicketTraceabilityModal: React.FC<TicketTraceabilityModalProps> = ({ ticket, service, station, onClose }) => {
  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '---';
  
  const getDuration = (start?: number, end?: number) => {
    if (!start || !end) return null;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  const steps = [
    { label: 'Emitido', time: ticket.createdAt, icon: '🎫', color: 'bg-blue-500', detail: 'Ticket generado en Tótem' },
    { label: 'Llamado', time: ticket.calledAt, icon: '📢', color: 'bg-amber-500', detail: `Llamado a ${station?.name || 'Módulo'}`, delta: getDuration(ticket.createdAt, ticket.calledAt) },
    { label: 'Iniciado', time: ticket.startedAt, icon: '👤', color: 'bg-emerald-500', detail: 'Atención presencial iniciada', delta: getDuration(ticket.calledAt, ticket.startedAt) },
    { label: 'Finalizado', time: ticket.endedAt, icon: '✅', color: ticket.status === TicketStatus.CANCELLED ? 'bg-red-500' : 'bg-slate-900', detail: ticket.status === TicketStatus.CANCELLED ? 'Marcado como Ausente' : 'Atención completada', delta: getDuration(ticket.startedAt, ticket.endedAt) },
  ].filter(s => s.time);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: service?.color }}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{service?.name}</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter">{ticket.code}</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">ID Seguimiento: {ticket.id.split('-')[0]}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-100"></div>
            <div className="space-y-8 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-6 items-start">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} text-white flex items-center justify-center text-xl shadow-lg shrink-0 z-10`}>
                    {step.icon}
                  </div>
                  <div className="flex-grow pt-1">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">{step.label}</h4>
                      <span className="text-xs font-mono font-bold text-slate-400">{formatTime(step.time)}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{step.detail}</p>
                    {step.delta && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded-md border border-slate-100">
                        LATENCIA: {step.delta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Módulo Responsable</p>
              <p className="text-sm font-black text-slate-800">{station?.name || 'Por asignar'}</p>
              <p className="text-[10px] text-slate-500 font-bold">{station?.operatorName || '---'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">T. Total Proceso</p>
              <p className="text-sm font-black text-slate-800">{getDuration(ticket.createdAt, ticket.endedAt) || 'En curso'}</p>
              <p className="text-[10px] text-slate-500 font-bold">Desde emisión</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketTraceabilityModal;
