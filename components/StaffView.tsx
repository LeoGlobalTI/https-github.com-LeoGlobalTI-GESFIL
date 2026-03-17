
import React, { useState, useMemo, useEffect } from 'react';
import { Ticket, Station, Service, TicketStatus, UserRole } from '../types';

interface StaffViewProps {
  station: Station | null;
  allStations?: Station[];
  tickets: Ticket[];
  services: Service[];
  userRole?: UserRole;
  isServiceActive: (service: Service, stationId?: string) => boolean;
  onStatusUpdate: (ticketId: string, status: TicketStatus, stationId: string) => void;
  onSelectStation?: (stationId: string) => void;
}

const StaffView: React.FC<StaffViewProps> = ({ 
  station, 
  allStations = [], 
  tickets, 
  services, 
  userRole,
  isServiceActive,
  onStatusUpdate,
  onSelectStation 
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

  const relevantTickets = useMemo(() => {
    if (!station) return [];
    return tickets.filter(t => {
      const service = services.find(s => s.id === t.serviceId);
      return station.serviceIds.includes(t.serviceId) && 
             service && 
             isServiceActive(service, station.id);
    });
  }, [tickets, station, services, isServiceActive]);

  const waitingTickets = useMemo(() => 
    relevantTickets
      .filter(t => t.status === TicketStatus.WAITING)
      .sort((a, b) => {
        // Prioridad absoluta para tickets preferentes
        if (a.metadata?.priority && !b.metadata?.priority) return -1;
        if (!a.metadata?.priority && b.metadata?.priority) return 1;
        // Orden cronológico para el mismo nivel de prioridad
        return a.createdAt - b.createdAt;
      }),
  [relevantTickets]);
  
  const activeTicket = tickets.find(t => station && t.stationId === station.id && 
    (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING));

  useEffect(() => {
    let interval: any;
    if (activeTicket?.status === TicketStatus.ATTENDING && activeTicket.startedAt) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - activeTicket.startedAt!) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeTicket?.status, activeTicket?.startedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWaitTime = (createdAt: number) => {
    const diff = Math.floor((Date.now() - createdAt) / 60000);
    return diff > 0 ? `${diff}m` : 'Reciente';
  };

  const currentService = activeTicket ? services.find(s => s.id === activeTicket.serviceId) : null;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-180px)] w-full max-w-[1600px] mx-auto gap-4 lg:gap-8 p-2 animate-fade-in">
      {/* Sidebar */}
      {allStations.length > 0 && (
        <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-5">
          <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col flex-grow overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block">Red de Módulos</span>
            </div>
            
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 pr-1.5 custom-scrollbar flex-grow no-scrollbar lg:scrollbar">
              {allStations.map(s => {
                const isActive = station && s.id === station.id;
                const stationWaitingCount = tickets.filter(t => 
                  t.status === TicketStatus.WAITING && s.serviceIds.includes(t.serviceId)
                ).length;
                const activeOnStation = tickets.find(t => 
                  t.stationId === s.id && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)
                );

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectStation?.(s.id)}
                    className={`flex-shrink-0 lg:w-full flex items-center justify-between px-4 py-3.5 rounded-[1.5rem] transition-all duration-300 group ${
                      isActive 
                        ? "bg-slate-900 text-white shadow-lg -translate-y-0.5" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex flex-col items-start min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${activeOnStation ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <p className={`text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                           {s.name}
                         </p>
                      </div>
                      <p className="text-[11px] font-black tracking-tight truncate w-full">{s.operatorName}</p>
                    </div>
                    {stationWaitingCount > 0 && (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {stationWaitingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-200/50 relative overflow-hidden group border border-white/5">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
             </div>
             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Supervisor Mode</p>
             <p className="text-[10px] font-bold leading-relaxed text-slate-400 italic">Asignación dinámica de recursos habilitada para el nodo actual.</p>
             <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Verificado</span>
             </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col gap-6">
        {!station ? (
          <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 p-10 text-center space-y-6 shadow-sm">
            <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-5xl animate-bounce">📍</div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Seleccione un Módulo</h2>
            <p className="text-slate-500 font-medium max-w-md leading-relaxed">Para comenzar a atender turnos, por favor seleccione uno de los módulos activos disponibles en el panel lateral.</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-xl shadow-slate-200">
                   <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operativo</p>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">{station.name}</h2>
                  <p className="text-xs text-slate-500 font-bold truncate">Responsable: <span className="text-indigo-600">{station.operatorName}</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                 <div className="text-right hidden md:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios Asignados</p>
                    <p className="text-[10px] font-bold text-slate-600">{station.serviceIds.length} Categorías Habilitadas</p>
                 </div>
                 <div className="flex -space-x-2">
                  {station.serviceIds.map(id => {
                    const s = services.find(sv => sv.id === id);
                    if (!s) return null;
                    const isActive = isServiceActive(s, station.id);
                    return (
                      <div key={id} title={s.name + (isActive ? '' : ' (Fuera de Horario)')} className={`w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center text-[10px] font-black text-white shadow-md hover:scale-110 transition-transform cursor-help ${isActive ? '' : 'grayscale opacity-40'}`} style={{ backgroundColor: s.color }}>
                        {s.prefix}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-grow">
          <div className="xl:col-span-4 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-100 flex flex-col overflow-hidden">
            <div className="px-8 py-6 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Lista de Espera</h3>
              </div>
              <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm">{waitingTickets.length}</span>
            </div>
            
            <div className="flex-grow overflow-y-auto max-h-[600px] custom-scrollbar divide-y divide-slate-100">
              {waitingTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8h-2c0-2.26-1.5-4.31-2-6-1.5 1.5-3 2.5-5 3.5a11 11 0 0 1-1 12.5"/></svg>
                  </div>
                  <p className="font-black text-slate-400 uppercase tracking-widest text-[11px]">Sincronizado</p>
                  <p className="text-xs text-slate-300 font-medium">Sin pacientes pendientes en red</p>
                </div>
              ) : (
                waitingTickets.map((t, idx) => {
                   const service = services.find(s => s.id === t.serviceId);
                   return (
                    <div key={t.id} className={`p-6 flex justify-between items-center hover:bg-slate-50 transition-all group animate-fade-in ${t.metadata?.priority ? 'bg-amber-50/30' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="flex items-center gap-5">
                        <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: t.metadata?.priority ? '#f59e0b' : service?.color }}></div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In: {getWaitTime(t.createdAt)}</p>
                            {t.metadata?.priority && (
                              <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Preferente</span>
                            )}
                          </div>
                          <p className="text-2xl font-black text-slate-900 tracking-tighter">{t.code}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onStatusUpdate(t.id, TicketStatus.CALLING, station.id)}
                        disabled={!!activeTicket}
                        className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 disabled:opacity-20 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                      >
                        Llamar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 h-full flex flex-col items-center justify-center text-center p-6 md:p-12 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 transition-colors duration-500" style={{ backgroundColor: currentService?.color || '#f1f5f9' }}></div>

              {activeTicket ? (
                <div className="w-full max-w-2xl flex flex-col items-center space-y-10 animate-fade-in">
                  <div className="w-full space-y-4">
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.25em] text-white mx-auto shadow-xl transition-all duration-500" style={{ backgroundColor: currentService?.color || '#333' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      {currentService?.name}
                    </div>
                    
                  <div className="w-full py-4 flex flex-col items-center justify-center overflow-hidden">
                    <h1 className="text-6xl sm:text-8xl md:text-[10vw] lg:text-[140px] font-black text-slate-900 leading-[0.9] tracking-tighter drop-shadow-sm select-none whitespace-nowrap overflow-hidden text-ellipsis w-full px-2 text-center uppercase">
                      {activeTicket.code}
                    </h1>
                  </div>
                  </div>

                  {activeTicket.status === TicketStatus.CALLING ? (
                    <div className="w-full space-y-10 pt-4">
                      <div className="bg-indigo-50/60 rounded-[2.5rem] p-8 border border-indigo-100 inline-block w-full max-w-md shadow-inner">
                        <p className="text-indigo-600 font-black uppercase tracking-[0.2em] text-xs">Paciente Notificado en Pantalla</p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto w-full">
                        <button 
                          onClick={() => onStatusUpdate(activeTicket.id, TicketStatus.ATTENDING, station.id)}
                          className="flex-[2] py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all text-xl flex items-center justify-center gap-3"
                        >
                          Iniciar Atención
                        </button>
                        <button 
                          onClick={() => onStatusUpdate(activeTicket.id, TicketStatus.CANCELLED, station.id)}
                          className="flex-1 py-6 bg-rose-50 text-rose-600 font-black rounded-3xl border border-rose-100 transition-all text-[11px] uppercase tracking-widest"
                        >
                          No se presentó
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-10 pt-4">
                      <div className="bg-slate-900 rounded-[3rem] px-12 md:px-16 py-8 md:py-10 inline-block shadow-2xl relative border border-slate-800">
                        <div className="flex flex-col items-center">
                          <div className="text-7xl md:text-8xl font-mono font-black text-white tracking-tight tabular-nums select-none">
                            {formatTime(elapsedTime)}
                          </div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-4">Cronómetro de Productividad</p>
                        </div>
                      </div>

                      <div className="flex justify-center w-full">
                        <button 
                          onClick={() => onStatusUpdate(activeTicket.id, TicketStatus.COMPLETED, station.id)}
                          className="w-full max-w-md py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all text-xl flex items-center justify-center gap-3"
                        >
                          Completar Trámite
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8 py-20 text-center animate-fade-in">
                  <div className="w-40 h-40 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-float"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Listo para Atender</h3>
                  <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    Terminal Sincronizada
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffView;
