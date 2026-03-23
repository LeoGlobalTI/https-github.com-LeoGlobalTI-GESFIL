import React, { useState, useEffect } from 'react';
import { Service, Printer, PrinterType } from '@/types';
import { PrinterService } from '@/services/PrinterService';

interface TotemViewProps {
  services: Service[];
  nextSequence: Record<string, number>;
  onIssueTicket: (serviceId: string, priority: boolean) => Promise<any>;
  printers: Printer[];
}

interface IssuedTicketInfo {
  code: string;
  serviceName: string;
  color: string;
  prefix: string;
  isPriority: boolean;
}

const TotemView: React.FC<TotemViewProps> = ({ services, nextSequence, onIssueTicket, printers }) => {
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicketInfo | null>(null);
  const [isPriority, setIsPriority] = useState<boolean | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  const handleIssue = async (service: Service) => {
    if (isPriority === null || isIssuing) return;
    setIsIssuing(true);

    try {
      // Emitimos el ticket al store y esperamos el resultado real
      const ticket = await onIssueTicket(service.id, isPriority);
      
      if (ticket) {
        // Mostramos la pantalla de éxito con el código real retornado por la DB
        setIssuedTicket({
          code: ticket.code,
          serviceName: service.name,
          color: service.color,
          prefix: service.prefix,
          isPriority
        });
      }
    } finally {
      setIsIssuing(false);
    }
  };

  // Temporizador para volver al menú principal (3 segundos) y disparar impresión
  useEffect(() => {
    if (issuedTicket) {
      // Intentar impresión física si hay impresoras configuradas
      const activePrinters = printers.filter(p => p.active);
      
      if (activePrinters.length > 0) {
        const now = new Date();
        const fechaStr = now.toLocaleDateString('es-CL');
        const horaStr = now.toLocaleTimeString('es-CL', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        }).toLowerCase().replace(' ', ' p. m.');

        const ticketData = {
          code: issuedTicket.code,
          prefix: issuedTicket.prefix,
          number: issuedTicket.code.replace(issuedTicket.prefix, ''),
          serviceName: issuedTicket.serviceName,
          isPriority: issuedTicket.isPriority,
          date: fechaStr,
          time: horaStr
        };

        // Imprimir en todas las impresoras activas
        activePrinters.forEach(printer => {
          PrinterService.printTicket(printer, ticketData).catch(err => {
            console.error(`Error imprimiendo en ${printer.name}:`, err);
          });
        });
      } else {
        // Si no hay impresoras configuradas, usamos el modo navegador como fallback limpio
        const now = new Date();
        const fechaStr = now.toLocaleDateString('es-CL');
        const horaStr = now.toLocaleTimeString('es-CL', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        }).toLowerCase().replace(' ', ' p. m.');

        const ticketData = {
          code: issuedTicket.code,
          prefix: issuedTicket.prefix,
          number: issuedTicket.code.replace(issuedTicket.prefix, ''),
          serviceName: issuedTicket.serviceName,
          isPriority: issuedTicket.isPriority,
          date: fechaStr,
          time: horaStr
        };

        const virtualPrinter: Printer = {
          id: 'virtual-browser',
          name: 'Navegador',
          type: PrinterType.BROWSER,
          address: '',
          active: true
        };

        PrinterService.printTicket(virtualPrinter, ticketData).catch(err => {
          console.error("Error en impresión virtual:", err);
        });
      }

      const closeTimer = setTimeout(() => {
        setIssuedTicket(null);
        setIsPriority(null);
      }, 4000);
    }
  }, [issuedTicket]);

  if (issuedTicket) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 md:p-12 bg-slate-50 animate-fade-in print:bg-white print:p-0 print:min-h-0">
        {/* Ticket Virtual (Pantalla) */}
        <div className="w-full max-w-[420px] bg-white rounded-[3.5rem] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden relative print:hidden">
          <div className="h-4 w-full" style={{ backgroundColor: issuedTicket.color }}></div>
          
          <div className="p-10 md:p-14 text-center space-y-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Turno Generado</p>
                {issuedTicket.isPriority && (
                  <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">Preferente</span>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-5 py-2">
                <span className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: issuedTicket.color }}>
                  {issuedTicket.prefix}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">
                  {issuedTicket.code.replace(issuedTicket.prefix, '')}
                </span>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mb-1">Área de Atención</p>
                <p className="text-lg font-bold text-slate-900 tracking-tight">
                  {issuedTicket.serviceName}
                </p>
              </div>
            </div>

            <div className="py-8 border-y border-dashed border-slate-200">
              <p className="text-[13px] text-slate-400 font-medium leading-relaxed italic px-4">
                Tome su ticket impreso y espere a ser llamado en los monitores de la sala.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-[progress_3s_linear]"></div>
              </div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Reiniciando sistema...</p>
            </div>
          </div>
        </div>

        {/* Ticket Físico (Solo Impresión - Optimizado para 80mm) */}
        <div className="hidden print:block w-[80mm] mx-auto p-4 text-black font-sans bg-white">
          <div className="text-center border-b-2 border-black pb-4 mb-4">
            <h2 className="text-xl font-black tracking-tighter">GESFIL</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest">Sistema de Gestión de Fila</p>
          </div>

          <div className="text-center py-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] mb-2">SU TURNO ES</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-black">{issuedTicket.prefix}</span>
              <span className="text-6xl font-black">{issuedTicket.code.replace(issuedTicket.prefix, '')}</span>
            </div>
            {issuedTicket.isPriority && (
              <p className="text-[14px] font-black border-2 border-black inline-block px-4 py-1 rounded-md uppercase">PREFERENTE</p>
            )}
          </div>

          <div className="text-center border-y border-black py-4 my-4">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1">ÁREA DE ATENCIÓN</p>
            <p className="text-lg font-black uppercase">{issuedTicket.serviceName}</p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-[12px] font-bold">{new Date().toLocaleDateString()} - {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[10px] leading-tight italic">Por favor, espere su turno en la sala de espera.</p>
          </div>

          <div className="mt-8 pt-4 border-t border-dashed border-black text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest">Gracias por su visita</p>
          </div>
        </div>

        <style>{`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 0;
            }
            nav, .dock-nav, button {
              display: none !important;
            }
          }
        `}</style>
      </div>
    );
  }

  if (isPriority === null) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-12 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <header className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-2xl shadow-indigo-200 animate-float">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-9 md:h-9">
              <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
            </svg>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tight mb-4">BIENVENIDO</h1>
          <p className="text-base md:text-2xl text-slate-500 font-semibold tracking-tight">Seleccione su tipo de atención</p>
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
      <header className="text-center mb-8 md:mb-12 animate-fade-in">
        <button 
          onClick={() => setIsPriority(null)}
          className="mb-6 md:mb-8 px-6 md:px-8 py-3 md:py-4 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 mx-auto active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver al inicio
        </button>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4 uppercase">SERVICIOS</h1>
        <p className="text-base md:text-xl text-slate-500 font-semibold tracking-tight">
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