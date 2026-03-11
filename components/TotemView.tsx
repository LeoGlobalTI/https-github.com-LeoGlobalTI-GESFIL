import React, { useState, useEffect } from 'react';
import { Service } from '../types';

interface TotemViewProps {
  services: Service[];
  nextSequence: Record<string, number>;
  onIssueTicket: (serviceId: string, priority: boolean) => void;
}

interface IssuedTicketInfo {
  code: string;
  serviceName: string;
  color: string;
  prefix: string;
  isPriority: boolean;
}

const TotemView: React.FC<TotemViewProps> = ({ services, nextSequence, onIssueTicket }) => {
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicketInfo | null>(null);
  const [isPriority, setIsPriority] = useState<boolean | null>(null);

  const handleIssue = (service: Service) => {
    if (isPriority === null) return;

    // Calculamos el código real basado en la secuencia actual antes de emitir
    const sequence = nextSequence[service.id] || 101;
    const realCode = `${service.prefix}-${sequence}`;

    // Emitimos el ticket al store
    onIssueTicket(service.id, isPriority);
    
    // Mostramos la pantalla de éxito con el código completo real
    setIssuedTicket({
      code: realCode,
      serviceName: service.name,
      color: service.color,
      prefix: service.prefix,
      isPriority
    });
  };

  // Temporizador para volver al menú principal (3 segundos)
  useEffect(() => {
    if (issuedTicket) {
      const timer = setTimeout(() => {
        setIssuedTicket(null);
        setIsPriority(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [issuedTicket]);

  if (issuedTicket) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 md:p-12 bg-slate-50 animate-fade-in">
        <div className="w-full max-w-lg md:max-w-xl bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden relative">
          <div className="h-6 w-full" style={{ backgroundColor: issuedTicket.color }}></div>
          
          <div className="p-12 md:p-16 text-center space-y-10">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-50 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center mx-auto mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce md:w-16 md:h-16">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <p className="text-[12px] md:text-[14px] font-black text-slate-400 uppercase tracking-[0.4em]">Su Turno es</p>
                {issuedTicket.isPriority && (
                  <span className="bg-amber-100 text-amber-600 text-[10px] md:text-[12px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Preferente</span>
                )}
              </div>
              <h1 className="text-8xl md:text-[10rem] font-black text-slate-900 tracking-tighter leading-none">
                {issuedTicket.code}
              </h1>
              <p className="text-base md:text-xl text-slate-500 font-bold mt-6 uppercase tracking-widest">
                Área de {issuedTicket.serviceName}
              </p>
            </div>

            <div className="py-10 border-y border-dashed border-slate-200">
              <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed italic">
                Tome su ticket impreso y espere a ser llamado en los monitores de la sala.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 pt-6">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-[progress_3s_linear]"></div>
              </div>
              <p className="text-[11px] md:text-[13px] font-black text-indigo-600 uppercase tracking-widest">Reiniciando sistema...</p>
            </div>
          </div>

          <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (isPriority === null) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-12 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <header className="text-center mb-12 animate-fade-in">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200 animate-float">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
            </svg>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-4">BIENVENIDO</h1>
          <p className="text-lg md:text-2xl text-slate-500 font-semibold tracking-tight">Seleccione su tipo de atención</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 animate-fade-in">
          <button
            onClick={() => setIsPriority(false)}
            className="group relative h-[240px] md:h-[320px] rounded-[3rem] bg-white border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 active:scale-[0.96] transition-all duration-500 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors md:w-10 md:h-10">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900">Atención General</h3>
            <div className="absolute bottom-0 left-0 h-2 w-0 group-hover:w-full transition-all duration-700 bg-slate-900" />
          </button>

          <button
            onClick={() => setIsPriority(true)}
            className="group relative h-[240px] md:h-[320px] rounded-[3rem] bg-white border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-amber-100/50 hover:-translate-y-2 active:scale-[0.96] transition-all duration-500 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 md:w-10 md:h-10">
                <path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 18h14"/><path d="M15 18v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2"/><path d="M12 7V2"/>
              </svg>
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900">Atención Preferente</h3>
            <div className="absolute bottom-0 left-0 h-2 w-0 group-hover:w-full transition-all duration-700 bg-amber-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <header className="text-center mb-12 animate-fade-in">
        <button 
          onClick={() => setIsPriority(null)}
          className="mb-8 px-8 py-4 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 mx-auto active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver al inicio
        </button>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-4 uppercase">SERVICIOS</h1>
        <p className="text-lg md:text-xl text-slate-500 font-semibold tracking-tight">
          {isPriority ? 'Atención Preferente' : 'Atención General'} • Seleccione el área
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
        {services.map((service, idx) => (
          <button
            key={service.id}
            onClick={() => handleIssue(service)}
            className="group relative w-full min-h-[180px] rounded-[2.5rem] overflow-hidden bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 hover:-translate-y-1 active:scale-[0.97] transition-all duration-500 text-left flex flex-col"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            {/* Contenido de texto */}
            <div className="flex-grow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em] shrink-0">
                  {service.prefix} UNIT
                </span>
                <div className="h-px flex-grow bg-slate-100" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-3">
                {service.name}
              </h3>
              <p className="text-xs md:text-sm text-slate-400 font-bold tracking-tight leading-relaxed line-clamp-2">
                {service.description}
              </p>
            </div>

            {/* Barra de acento inferior con color del servicio */}
            <div className="h-3 w-full transition-all duration-500 group-hover:h-4" style={{ backgroundColor: service.color }} />
            
            {/* Icono flotante sutil */}
            <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
               <div className="w-12 h-12 rounded-full" style={{ backgroundColor: service.color }} />
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-20 text-center opacity-40">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">GESFIL • Terminal de Autoservicio</p>
      </footer>
    </div>
  );
};

export default TotemView;