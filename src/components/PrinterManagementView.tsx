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
      const fechaStr = now.toLocaleDateString('es-CL');
      const horaStr = now.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }).toLowerCase();

      await PrinterService.printTicket(printer, {
        code: 'TEST-000',
        prefix: 'TEST',
        number: '000',
        serviceName: 'PRUEBA DE SISTEMA',
        isPriority: false,
        date: fechaStr,
        time: horaStr
      });
      if (printer.type !== PrinterType.BROWSER) {
        alert(`Test enviado con éxito a ${printer.name}`);
      }
    } catch (err: any) {
      alert(`Error en test: ${err.message}`);
    }
  };

  const [checkingBridgeId, setCheckingBridgeId] = useState<string | null>(null);

  const checkBridgeStatus = async (printer: Printer) => {
    setCheckingBridgeId(printer.id);
    const bridgeUrl = printer.address || 'http://localhost:3001/imprimir';
    
    try {
      // Intentamos un ping rápido (OPTIONS o POST vacío)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch(bridgeUrl, { 
        method: 'OPTIONS', 
        mode: 'cors',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      alert(`✅ Conexión exitosa con el Bridge en ${bridgeUrl}. El servidor está respondiendo correctamente.`);
    } catch (err: any) {
      console.error("Bridge Check Error:", err);
      
      const isHttps = window.location.protocol === 'https:';
      const isLocal = bridgeUrl.includes('localhost') || bridgeUrl.includes('127.0.0.1');

      if (err.name === 'AbortError') {
        alert(`❌ Tiempo de espera agotado. El Bridge en ${bridgeUrl} no respondió a tiempo.`);
      } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        if (isHttps && !isLocal && bridgeUrl.startsWith('http:')) {
          alert(`⚠️ BLOQUEO DE SEGURIDAD (Mixed Content):\n\nLa aplicación es segura (HTTPS) pero el Bridge es HTTP.\n\nSOLUCIÓN:\n1. Haz clic en el candado junto a la URL.\n2. Ve a 'Configuración del sitio'.\n3. Cambia 'Contenido no seguro' a 'Permitir'.\n4. Recarga la página.`);
        } else {
          alert(`❌ ERROR DE CONEXIÓN: No se pudo encontrar el Bridge en ${bridgeUrl}.\n\n1. Asegúrese de que 'node server.js' esté ejecutándose en su PC.\n2. Verifique que la dirección IP/Puerto sea correcta.`);
        }
      } else {
        alert(`❌ Error inesperado: ${err.message}`);
      }
    } finally {
      setCheckingBridgeId(null);
    }
  };

  const downloadBridgeCode = () => {
    const code = `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN DE TU IMPRESORA ---
const EQUIPO = "lnunez";
const IMPRESORA = "epsontm";
const PUERTO = 3001;

// Configuración de CORS total para evitar "Failed to fetch"
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.text({ type: '*/*', limit: '1mb' })); 

// Manejador explícito para OPTIONS (Pre-flight)
app.options('*', cors());

app.post('/imprimir', (req, res) => {
    console.log(\`[\${new Date().toLocaleTimeString()}] Petición de impresión recibida...\`);
    const ticketData = req.body;
    
    if (!ticketData) {
        console.error(">>> Error: No se recibió contenido en el ticket.");
        return res.status(400).json({ success: false, error: "Contenido vacío" });
    }

    const tempFilePath = path.join(__dirname, 'temp_ticket.bin');

    try {
        // Escribir los comandos ESC/POS al archivo binario
        fs.writeFileSync(tempFilePath, ticketData, 'binary');

        // Comando para inyectar al spooler de Windows
        const comando = \`copy /b "\${tempFilePath}" "\\\\\\\\\${EQUIPO}\\\\\${IMPRESORA}"\`;
        
        console.log(\`>>> Ejecutando: \${comando}\`);

        exec(comando, (error) => {
            if (error) {
                console.error(\`>>> Error de Windows: \${error.message}\`);
                return res.status(500).json({ success: false, error: error.message });
            }
            console.log(">>> Ticket enviado a la cola de impresión con éxito.");
            res.json({ success: true });
        });
    } catch (err) {
        console.error(\`>>> Error de Sistema: \${err.message}\`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Ruta de salud para verificar conexión
app.get('/health', (req, res) => res.json({ status: 'ok', message: 'Bridge GESFIL activo' }));

app.listen(PUERTO, '0.0.0.0', () => {
    console.log(\`\\n========================================\`);
    console.log(\`   BRIDGE GESFIL ACTIVO EN PUERTO \${PUERTO}\`);
    console.log(\`========================================\`);
    console.log(\`1. URL en App: http://localhost:\${PUERTO}/imprimir\`);
    console.log(\`2. Impresora: \\\\\\\\\${EQUIPO}\\\\\${IMPRESORA}\`);
    console.log(\`3. Estado: Esperando peticiones...\\n\`);
});`;
    
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'server.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Archivo 'server.js' descargado. Ejecútelo con 'node server.js' en su PC.");
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Impresoras</h2>
          <p className="text-slate-500 text-sm font-medium">Configure terminales de impresión térmica USB, Red o Bridge Local.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewPrinter({
                name: 'Bridge Local',
                type: PrinterType.BRIDGE,
                address: 'http://localhost:3001/imprimir',
                active: true
              });
              setIsAdding(true);
            }}
            className="px-5 py-3 bg-indigo-50 text-indigo-600 border-2 border-indigo-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Configurar Bridge
          </button>
          <button
            onClick={discoverUSB}
            className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect x="7" y="16" width="10" height="6" rx="2"/><path d="M7 10v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4"/></svg>
            Buscar USB
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
                <option value={PrinterType.BRIDGE}>Bridge GESFIL (Local Server)</option>
                <option value={PrinterType.BROWSER}>Impresora del Sistema (Diálogo)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                {newPrinter.type === PrinterType.NETWORK ? 'Dirección IP o URL de Proxy' : 
                 newPrinter.type === PrinterType.BRIDGE ? 'URL del Bridge (server.js)' : 'Identificador USB'}
              </label>
              <input
                type="text"
                placeholder={newPrinter.type === PrinterType.NETWORK ? '192.168.1.100 o http://localhost:5000' : 
                             newPrinter.type === PrinterType.BRIDGE ? 'http://localhost:3001/imprimir' : 'USB001'}
                value={newPrinter.address}
                onChange={e => setNewPrinter({ ...newPrinter, address: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              />
              {newPrinter.type === PrinterType.NETWORK && (
                <p className="text-[9px] text-slate-400 mt-1 px-1">
                  Use una IP para modo manual (requiere diálogo) o una URL (http://...) para impresión silenciosa vía proxy.
                </p>
              )}
              {newPrinter.type === PrinterType.BRIDGE && (
                <p className="text-[9px] text-indigo-400 mt-1 px-1 font-bold">
                  Recomendado: Use http://localhost:3001/imprimir si el bridge está en esta PC.
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
        {printers.map(printer => (
          <div key={printer.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${printer.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                {printer.type === PrinterType.NETWORK || printer.type === PrinterType.BRIDGE ? (
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
                {printer.type === PrinterType.NETWORK ? `IP: ${printer.address}:${printer.port}` : 
                 printer.type === PrinterType.BRIDGE ? `BRIDGE: ${printer.address || 'http://localhost:3001/imprimir'}` :
                 `USB: ${printer.address}`}
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
                {printer.type === PrinterType.BRIDGE && (
                  <button 
                    onClick={() => checkBridgeStatus(printer)}
                    disabled={checkingBridgeId === printer.id}
                    className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                  >
                    {checkingBridgeId === printer.id ? 'Verificando...' : 'Verificar Bridge'}
                  </button>
                )}
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
