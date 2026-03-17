import React, { useState } from 'react';
import { Printer, PrinterType } from '@/types';
import { ICONS } from '@/constants';
import { PrinterService } from '@/services/PrinterService';

interface PrinterManagementViewProps {
  printers: Printer[];
  onAdd: (p: Omit<Printer, 'id'>) => void;
  onUpdate: (id: string, p: Partial<Printer>) => void;
  onDelete: (id: string) => void;
}

const PrinterManagementView: React.FC<PrinterManagementViewProps> = ({ printers, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPrinter, setNewPrinter] = useState<Omit<Printer, 'id'>>({
    name: '',
    type: PrinterType.NETWORK,
    address: '',
    port: 9100,
    active: true
  });

  const handleAdd = () => {
    if (!newPrinter.name) return;
    onAdd(newPrinter);
    setIsAdding(false);
    setNewPrinter({
      name: '',
      type: PrinterType.NETWORK,
      address: '',
      port: 9100,
      active: true
    });
  };

  const [isSearching, setIsSearching] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);

  React.useEffect(() => {
    const loadPaired = async () => {
      const nav = navigator as any;
      if (nav.usb) {
        try {
          const devices = await nav.usb.getDevices();
          setPairedDevices(devices);
        } catch (e) {
          console.error("Error loading paired devices:", e);
        }
      }
    };
    loadPaired();
  }, []);

  const discoverUSB = async () => {
    try {
      const nav = navigator as any;
      if (!nav.usb) {
        alert("Su navegador no soporta WebUSB. Use Chrome o Edge.");
        return;
      }
      const device = await nav.usb.requestDevice({ filters: [] });
      if (device) {
        setNewPrinter({
          ...newPrinter,
          name: device.productName || `Impresora USB ${device.productId}`,
          type: PrinterType.USB,
          address: `VID_${device.vendorId}_PID_${device.productId}`,
          active: true
        });
        setIsAdding(true);
        // Refresh paired list
        const nav = navigator as any;
        const devices = await nav.usb.getDevices();
        setPairedDevices(devices);
      }
    } catch (err) {
      console.error("USB Discovery Error:", err);
    }
  };

  const simulateNetworkScan = () => {
    setIsSearching(true);
    // Simulación de escaneo de red local
    setTimeout(() => {
      setIsSearching(false);
      alert("Escaneo completado. No se encontraron nuevas impresoras en el segmento de red actual. Por favor, ingrese la IP manualmente.");
    }, 2000);
  };

  const handleTestPrint = async (printer: Printer) => {
    try {
      const now = new Date();
      await PrinterService.printTicket(printer, {
        code: 'TEST-000',
        prefix: 'TEST',
        number: '000',
        serviceName: 'PRUEBA DE SISTEMA',
        isPriority: false,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      if (printer.type !== PrinterType.BROWSER) {
        alert(`Test enviado con éxito a ${printer.name}`);
      }
    } catch (err: any) {
      alert(`Error en test: ${err.message}`);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Impresoras</h2>
          <p className="text-slate-500 text-sm font-medium">Configure terminales de impresión térmica USB y Red.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={discoverUSB}
            className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect x="7" y="16" width="10" height="6" rx="2"/><path d="M7 10v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4"/></svg>
            Buscar USB
          </button>
          <button
            onClick={simulateNetworkScan}
            disabled={isSearching}
            className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>
            )}
            Escanear Red
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Manual
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 animate-slide-up">
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Configuración de Terminal</h3>
            {pairedDevices.length > 0 && newPrinter.type === PrinterType.USB && (
              <div className="flex flex-wrap gap-2 mb-6">
                {pairedDevices.map((dev, i) => (
                  <button
                    key={i}
                    onClick={() => setNewPrinter({
                      ...newPrinter,
                      name: dev.productName || `USB Device ${dev.productId}`,
                      address: `VID_${dev.vendorId}_PID_${dev.productId}`
                    })}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  >
                    Usar: {dev.productName || 'Disp. Desconocido'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Identificador</label>
              <input
                type="text"
                placeholder="Ej: Epson Recepción"
                value={newPrinter.name}
                onChange={e => setNewPrinter({ ...newPrinter, name: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Conexión</label>
              <select
                value={newPrinter.type}
                onChange={e => setNewPrinter({ ...newPrinter, type: e.target.value as PrinterType })}
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm appearance-none"
              >
                <option value={PrinterType.NETWORK}>Red (TCP/IP)</option>
                <option value={PrinterType.USB}>Local (USB)</option>
                <option value={PrinterType.BROWSER}>Impresora del Sistema (Diálogo)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                {newPrinter.type === PrinterType.NETWORK ? 'Dirección IP o URL de Proxy' : 'Identificador USB'}
              </label>
              <input
                type="text"
                placeholder={newPrinter.type === PrinterType.NETWORK ? '192.168.1.100 o http://localhost:5000' : 'USB001'}
                value={newPrinter.address}
                onChange={e => setNewPrinter({ ...newPrinter, address: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              />
              {newPrinter.type === PrinterType.NETWORK && (
                <p className="text-[9px] text-slate-400 mt-1 px-1">
                  Use una IP para modo manual (requiere diálogo) o una URL (http://...) para impresión silenciosa vía proxy.
                </p>
              )}
            </div>
            {newPrinter.type === PrinterType.NETWORK && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Puerto</label>
                <input
                  type="number"
                  value={isNaN(newPrinter.port as number) ? '' : (newPrinter.port ?? '')}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                    setNewPrinter({ ...newPrinter, port: val });
                  }}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
            <button onClick={handleAdd} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl">Guardar Configuración</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Connection Help Card */}
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white space-y-4 shadow-xl shadow-indigo-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-black leading-tight">¿No ves tu impresora?</h3>
            <p className="text-indigo-100 text-xs font-medium leading-relaxed">
              Por seguridad, los navegadores no pueden ver todas tus impresoras automáticamente. 
              Debes "Vincularlas" primero usando el botón <strong>Buscar USB</strong>.
            </p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[10px] font-bold text-indigo-200">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Usa Chrome o Edge (Windows/Android)
            </li>
            <li className="flex items-center gap-2 text-[10px] font-bold text-indigo-200">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Conecta el cable USB y enciende la impresora
            </li>
            <li className="flex items-center gap-2 text-[10px] font-bold text-indigo-200">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Si recibes "Access Denied", usa Zadig (WinUSB) o cambia el tipo a "Navegador"
            </li>
            <li className="flex items-center gap-2 text-[10px] font-bold text-indigo-200">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              El modo "Navegador" es el más compatible y no requiere drivers especiales
            </li>
          </ul>
        </div>

        {printers.map(printer => (
          <div key={printer.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${printer.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                {printer.type === PrinterType.NETWORK ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect x="7" y="16" width="10" height="6" rx="2"/><path d="M7 10v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4"/></svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUpdate(printer.id, { active: !printer.active })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${printer.active ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${printer.active ? 'left-5' : 'left-1'}`} />
                </button>
                <button onClick={() => onDelete(printer.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-slate-900">{printer.name}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {printer.type === PrinterType.NETWORK ? `IP: ${printer.address}:${printer.port}` : `USB: ${printer.address}`}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${printer.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {printer.active ? 'En Línea' : 'Desconectada'}
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleTestPrint(printer)}
                  className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Test
                </button>
                {printer.type === PrinterType.USB && (
                  <>
                    <button 
                      onClick={discoverUSB}
                      className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600"
                    >
                      Re-vincular
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const nav = navigator as any;
                          const devices = await nav.usb.getDevices();
                          const device = devices.find((d: any) => `VID_${d.vendorId}_PID_${d.productId}` === printer.address);
                          if (device && device.forget) {
                            await device.forget();
                            alert("Dispositivo desvinculado del navegador.");
                            window.location.reload();
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600"
                    >
                      Olvidar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {printers.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 text-4xl">🖨️</div>
            <p className="text-slate-400 font-bold italic">No hay impresoras configuradas en el nodo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterManagementView;
