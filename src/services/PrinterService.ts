import { Printer, PrinterType } from '@/types';

export class PrinterService {
  static async printTicket(printer: Printer, ticketData: {
    code: string;
    prefix: string;
    number: string;
    serviceName: string;
    isPriority: boolean;
    date: string;
    time: string;
  }) {
    try {
      if (printer.type === PrinterType.USB) {
        return await this.printUSB(printer, ticketData);
      } else if (printer.type === PrinterType.NETWORK) {
        try {
          return await this.printNetwork(printer, ticketData);
        } catch (netError: any) {
          console.warn("Fallo impresión de red, intentando fallback a navegador:", netError.message);
          return this.printBrowser(ticketData);
        }
      } else if (printer.type === PrinterType.BRIDGE) {
        try {
          return await this.printBridge(printer, ticketData);
        } catch (bridgeError: any) {
          console.warn("Fallo impresión por Bridge, intentando fallback a navegador:", bridgeError.message);
          return this.printBrowser(ticketData);
        }
      } else if (printer.type === PrinterType.BROWSER) {
        return this.printBrowser(ticketData);
      }
    } catch (error: any) {
      console.error("Error en printTicket:", error);
      // Si falla el USB o Bridge por acceso denegado o dispositivo ocupado, intentamos fallback a browser
      const isAccessDenied = 
        error.name === 'SecurityError' || 
        error.name === 'NetworkError' ||
        error.message.includes('Access denied') || 
        error.message.includes('Acceso denegado') ||
        error.message.includes('siendo usada') ||
        error.message.includes('Failed to fetch');

      if ((printer.type === PrinterType.USB || printer.type === PrinterType.BRIDGE) && isAccessDenied) {
        console.warn("Fallo impresión física, intentando fallback a navegador...");
        return this.printBrowser(ticketData);
      }
      throw error;
    }
  }

  private static getEscPosString(data: any): string {
    // --- Comandos ESC/POS (Estándar Epson) ---
    const ESC = "\x1B";
    const GS = "\x1D";
    const INIT = ESC + "@";               // Inicializar
    const CENTRAR = ESC + "a\x01";        // Alinear al centro
    const NEGRITA_ON = ESC + "E\x01";     // Negrita activada
    const NEGRITA_OFF = ESC + "E\x00";    // Negrita desactivada
    const TAMANO_NORMAL = GS + "!\x00";   // Fuente normal
    const TAMANO_GRANDE = GS + "!\x11";   // Doble ancho y alto para el turno
    const CORTE = GS + "V" + String.fromCharCode(65) + String.fromCharCode(3);

    // --- Formateo de Fecha y Hora (Siguiendo tu ejemplo) ---
    // Nota: Usamos los datos que vienen del componente para mantener consistencia
    // pero aplicamos el estilo de tu ejemplo si es necesario.
    
    let ticket = INIT + CENTRAR;
    
    // Encabezado
    ticket += NEGRITA_ON + TAMANO_NORMAL + "GESFIL\n";
    ticket += NEGRITA_OFF + "Sistema de Gestión de Fila\n";
    ticket += "________________________________\n\n";
    
    // Cuerpo: Turno
    ticket += "SU TURNO ES\n\n";
    ticket += NEGRITA_ON + TAMANO_GRANDE + `${data.prefix} ${data.number}` + "\n\n";
    ticket += NEGRITA_OFF + TAMANO_NORMAL;

    if (data.isPriority) {
      ticket += NEGRITA_ON + "--- PREFERENTE ---\n\n" + NEGRITA_OFF;
    }
    
    // Cuerpo: Área
    ticket += NEGRITA_ON + "ÁREA DE ATENCIÓN\n";
    ticket += NEGRITA_OFF + data.serviceName + "\n\n";
    
    // Pie de página
    ticket += `${data.date} - ${data.time}\n`;
    ticket += "Gracias por su visita\n";
    
    // Espacio final y corte
    ticket += "\n\n\n\n" + CORTE;

    return ticket;
  }

  private static getEscPosCommands(data: any): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(this.getEscPosString(data));
  }

  private static async printBridge(printer: Printer, data: any) {
    const bridgeUrl = printer.address || 'http://localhost:3001/imprimir';
    const commands = this.getEscPosString(data);

    try {
      const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: commands,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`El Bridge respondió con error: ${response.status}`);
      }
      return true;
    } catch (e: any) {
      console.error("Error enviando a Bridge de impresión:", e);
      
      // Detectar bloqueo de contenido mixto (HTTPS -> HTTP)
      const isHttps = window.location.protocol === 'https:';
      const isLocal = bridgeUrl.includes('localhost') || bridgeUrl.includes('127.0.0.1');
      
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
        if (isHttps && !isLocal && bridgeUrl.startsWith('http:')) {
          throw new Error(`BLOQUEO DE SEGURIDAD: El navegador bloquea la conexión a una IP privada (${bridgeUrl}) desde HTTPS.\n\nSOLUCIÓN:\n1. Haz clic en el candado de la URL.\n2. Ve a "Configuración del sitio".\n3. Cambia "Contenido no seguro" a "Permitir".\n4. Recarga la página.`);
        } else {
          throw new Error(`ERROR DE CONEXIÓN: No se pudo encontrar el Bridge en ${bridgeUrl}.\n\n1. Verifique que 'node server.js' esté ejecutándose en su PC.\n2. Asegúrese de que la dirección IP/Puerto sea correcta.`);
        }
      }

      throw e;
    }
  }

  private static printBrowser(data: any) {
    const printWindow = window.open('', '_blank', 'width=300,height=450');
    if (!printWindow) {
      alert("La ventana de impresión fue bloqueada por el navegador. Por favor, permita las ventanas emergentes para este sitio.");
      return false;
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; text-align: center; padding: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .number { font-size: 48px; font-weight: bold; margin: 20px 0; }
            .footer { font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="title">GESFIL</div>
          <div>Sistema de Gestión de Fila</div>
          <hr/>
          <div>SU TURNO ES</div>
          <div class="number">${data.prefix} ${data.number}</div>
          ${data.isPriority ? '<div style="font-weight:bold">--- PREFERENTE ---</div>' : ''}
          <div style="margin-top:20px">
            <strong>ÁREA DE ATENCIÓN</strong><br/>
            ${data.serviceName}
          </div>
          <div class="footer">
            ${data.date} - ${data.time}<br/>
            Gracias por su visita
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }

  private static async printUSB(printer: Printer, data: any) {
    let device: any = null;
    try {
      const nav = navigator as any;
      if (!nav.usb) throw new Error("WebUSB not supported");

      const devices = await nav.usb.getDevices();
      console.log("Dispositivos USB vinculados encontrados:", devices.length);
      
      device = devices.find((d: any) => 
        `VID_${d.vendorId}_PID_${d.productId}` === printer.address
      );

      if (!device) {
        console.error("No se encontró el dispositivo con dirección:", printer.address);
        console.log("Direcciones disponibles:", devices.map((d: any) => `VID_${d.vendorId}_PID_${d.productId}`));
        throw new Error("Dispositivo no encontrado. Asegúrese de haberlo vinculado en configuración.");
      }

      console.log("Intentando abrir dispositivo:", device.productName);
      try {
        if (!device.opened) {
          await device.open();
        }
      } catch (e: any) {
        if (e.name === 'SecurityError' || e.message.includes('Access denied')) {
          throw new Error("Acceso denegado a la impresora. Esto suele ocurrir si el driver de Windows está usando la impresora. Intente desinstalar el driver de la impresora o usar una herramienta como Zadig para cambiar el driver a WinUSB.");
        }
        throw e;
      }

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      // Encontrar la interfaz de impresión
      let interfaceNum = -1;
      let endpointOut = -1;

      // Primero intentamos buscar la clase estándar de impresora (7)
      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 7 || alt.interfaceClass === 255) { 
            for (const ep of alt.endpoints) {
              if (ep.direction === 'out' && ep.type === 'bulk') {
                interfaceNum = iface.interfaceNumber;
                endpointOut = ep.endpointNumber;
                break;
              }
            }
          }
          if (interfaceNum !== -1) break;
        }
        if (interfaceNum !== -1) break;
      }

      // Si no encontramos por clase, buscamos cualquier endpoint de salida bulk
      if (interfaceNum === -1) {
        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.direction === 'out' && ep.type === 'bulk') {
                interfaceNum = iface.interfaceNumber;
                endpointOut = ep.endpointNumber;
                break;
              }
            }
            if (interfaceNum !== -1) break;
          }
          if (interfaceNum !== -1) break;
        }
      }

      if (interfaceNum === -1 || endpointOut === -1) {
        throw new Error("No se encontró un canal de comunicación compatible en la impresora. Verifique que sea una impresora térmica ESC/POS.");
      }

      try {
        await device.claimInterface(interfaceNum);
      } catch (e: any) {
        if (e.name === 'NetworkError') {
          throw new Error("La impresora está siendo usada por otra pestaña o aplicación. Ciérrela e intente de nuevo.");
        }
        throw e;
      }

      const commands = this.getEscPosCommands(data);
      await device.transferOut(endpointOut, commands);
      return true;
    } catch (error) {
      console.error("Error de impresión USB:", error);
      throw error;
    } finally {
      // Intentar cerrar el dispositivo siempre para liberar el recurso
      try {
        if (device && device.opened) {
          await device.close();
        }
      } catch (e) {
        console.error("Error al cerrar dispositivo en cleanup:", e);
      }
    }
  }

  private static async printNetwork(printer: Printer, data: any) {
    // Si la dirección es una URL, intentamos enviar los datos a un proxy de impresión
    if (printer.address?.startsWith('http')) {
      try {
        const response = await fetch(printer.address, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          mode: 'cors'
        });
        if (response.ok) return true;
        throw new Error(`El proxy respondió con error: ${response.status}`);
      } catch (e: any) {
        console.error("Error enviando a proxy de impresión:", e);
        throw new Error(`Error de conexión con el proxy en ${printer.address}. Verifique que el agente local esté activo.`);
      }
    }

    // La impresión de red directa (TCP raw) desde el navegador es limitada por seguridad.
    // Fallback informativo para guiar al usuario.
    console.warn("Impresión de red directa no soportada por el navegador.");
    throw new Error("La impresión de red requiere un agente de impresión local o configuración de proxy.");
  }
}
