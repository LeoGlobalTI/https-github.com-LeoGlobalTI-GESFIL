
import React, { useMemo, useState, useEffect } from 'react';
import { Ticket, Service, Station, TicketStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import TicketTraceabilityModal from './TicketTraceabilityModal';
import { analyzeOperationalHealth } from '../services/gemini';

interface DashboardViewProps {
  tickets: Ticket[];
  services: Service[];
  stations: Station[];
  onToggleService?: (id: string, active: boolean) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ tickets, services, stations, onToggleService }) => {
  const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("Sincronizando con motor de inteligencia...");

  useEffect(() => {
    if (tickets.length > 3) {
      analyzeOperationalHealth(tickets, services).then(setAiInsight);
    }
  }, [tickets.length, services]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const completed = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
    const waiting = tickets.filter(t => t.status === TicketStatus.WAITING).length;
    const cancelled = tickets.filter(t => t.status === TicketStatus.CANCELLED).length;
    
    // Solo mostrar servicios que existen en la configuración actual
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const dataByService = services.map(s => {
      const sTickets = tickets.filter(t => t.serviceId === s.id);
      const isClosed = (s.startTime && currentTime < s.startTime) || (s.endTime && currentTime > s.endTime);
      
      return {
        name: isClosed ? `${s.name} (Cerrado)` : s.name,
        value: sTickets.length,
        color: s.color || '#4f46e5'
      };
    }).filter(item => item.value > 0 || services.some(s => s.name === item.name && s.active));

    const recent = [...tickets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

    return { total, completed, waiting, cancelled, dataByService, recent };
  }, [tickets, services]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">GESFIL Business Hub</h1>
          <p className="text-slate-500 font-medium">Infraestructura de Gestión en Tiempo Real</p>
        </div>
        
        <div className="bg-indigo-900 text-indigo-100 p-6 rounded-[2.5rem] shadow-2xl border border-indigo-700 max-w-md relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">✨</div>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">IA Insights (Gemini)</p>
           <p className="text-xs font-bold leading-relaxed">{aiInsight}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Turnos', value: stats.total, color: 'text-slate-900' },
          { label: 'Atendidos', value: stats.completed, color: 'text-emerald-500' },
          { label: 'En Cola', value: stats.waiting, color: 'text-amber-500' },
          { label: 'Cancelados', value: stats.cancelled, color: 'text-rose-500' },
        ].map((k, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:-translate-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{k.label}</p>
            <p className={`text-4xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-10">Distribución por Servicio</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dataByService}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={45}>
                  {stats.dataByService.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
           <h3 className="text-lg font-black mb-8 uppercase tracking-widest text-indigo-400">Trazabilidad Reciente</h3>
           <div className="space-y-4">
              {stats.recent.length > 0 ? stats.recent.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all cursor-pointer" onClick={() => setInspectingTicket(t)}>
                   <div>
                      <p className="text-sm font-black text-white">{t.code}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black">{new Date(t.createdAt).toLocaleTimeString()}</p>
                   </div>
                   <div className={`w-2 h-2 rounded-full ${t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-500 italic text-sm">No hay transacciones hoy</div>
              )}
           </div>
        </div>
      </div>

      {inspectingTicket && (
        <TicketTraceabilityModal 
          ticket={inspectingTicket}
          service={services.find(s => s.id === inspectingTicket.serviceId)}
          station={stations.find(st => st.id === inspectingTicket.stationId)}
          onClose={() => setInspectingTicket(null)}
        />
      )}
    </div>
  );
};

export default DashboardView;
