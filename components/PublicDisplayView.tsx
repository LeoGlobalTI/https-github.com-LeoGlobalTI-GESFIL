import React, { useEffect, useState, useMemo } from 'react';
import { Ticket, Station, TicketStatus, Service } from '../types';

interface PublicDisplayViewProps {
  tickets: Ticket[];
  stations: Station[];
  services: Service[];
}

const PublicDisplayView: React.FC<PublicDisplayViewProps> = ({ tickets, stations, services }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeCalls = useMemo(() => 
    tickets
      .filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === TicketStatus.CALLING ? -1 : 1;
        return (b.calledAt || 0) - (a.calledAt || 0);
      })
      .slice(0, 5),
  [tickets]);

  const waitingList = useMemo(() => 
    tickets
      .filter(t => t.status === TicketStatus.WAITING)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 8),
  [tickets]);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-12 font-sans flex flex-col overflow-hidden selection:bg-indigo-500">
      <header className="flex justify-between items-center mb-16 animate-fade-in">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-950">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none">GESFIL<span className="text-indigo-500">.</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Display Center Premium</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="text-6xl font-extrabold tracking-tighter leading-none tabular-nums text-indigo-50">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <span className="text-2xl ml-2 opacity-30">{now.toLocaleTimeString([], { second: '2-digit' })}</span>
          </div>
          <div className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-[0.2em]">
            {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-4 px-4 mb-4">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.5em]">Llamados Activos</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {activeCalls.map((ticket, idx) => {
              const station = stations.find(s => s.id === ticket.stationId);
              const isCalling = ticket.status === TicketStatus.CALLING;

              return (
                <div 
                  key={ticket.id}
                  className={`flex items-center justify-between p-10 rounded-[3.5rem] border transition-all duration-700 animate-fade-in ${
                    isCalling 
                    ? "bg-indigo-600 border-indigo-400 scale-[1.02] shadow-[0_0_80px_-10px_rgba(79,70,229,0.5)]" 
                    : "bg-slate-900/40 border-slate-800/50"
                  }`}
                  style={{ animationDelay: `${idx * 0.15}s` }}
                >
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-black uppercase tracking-[0.4em] mb-2 ${isCalling ? 'text-indigo-200' : 'text-slate-500'}`}>Paciente</span>
                    <span className="text-[100px] font-black leading-none tracking-tighter">{ticket.code}</span>
                  </div>
                  
                  <div className="h-24 w-[1px] bg-white/10"></div>
                  
                  <div className="text-right">
                    <span className={`text-[11px] font-black uppercase tracking-[0.4em] mb-2 ${isCalling ? 'text-indigo-200' : 'text-slate-500'}`}>Módulo</span>
                    <div className="flex items-baseline justify-end gap-3">
                      <span className="text-[100px] font-black leading-none tracking-tighter">
                        {station?.name.split(' ').pop() || "00"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {activeCalls.length === 0 && (
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-[4rem]">
                <p className="text-3xl font-black uppercase tracking-widest text-slate-800 italic">Sincronizando flujo...</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
           <div className="bg-[#0f172a] rounded-[4rem] p-10 flex flex-col border border-slate-800/50 shadow-2xl h-full">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">En Espera</h3>
                <span className="bg-indigo-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-950">
                  Total: {tickets.filter(t => t.status === TicketStatus.WAITING).length}
                </span>
             </div>

             <div className="flex-grow space-y-3 mb-12 overflow-hidden">
               {waitingList.length > 0 ? (
                 waitingList.map((t, idx) => {
                   const service = services.find(s => s.id === t.serviceId);
                   return (
                     <div key={t.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-10 rounded-full" style={{ backgroundColor: service?.color || '#333' }}></div>
                          <span className="text-3xl font-bold tracking-tighter">{t.code}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{service?.name || '---'}</span>
                     </div>
                   );
                 })
               ) : (
                 <div className="h-full flex items-center justify-center opacity-10 italic text-slate-400">
                    Sin turnos pendientes
                 </div>
               )}
             </div>

             <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] shadow-2xl shadow-indigo-950 border border-indigo-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-125">
                   <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                <div className="relative z-10">
                  <p className="text-indigo-100 text-sm font-bold leading-relaxed">Prepare su documento de identidad y espere a ser llamado en pantalla.</p>
                </div>
             </div>
           </div>
        </div>
      </main>

      <footer className="mt-12 bg-slate-900/30 py-4 px-10 rounded-full border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em]">GESFIL ENTERPRISE</span>
           <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
           <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Sincronización en tiempo real con Nodo Central</span>
        </div>
        <div className="flex gap-4">
          {services.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{s.name}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default PublicDisplayView;