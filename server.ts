import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import net from "net";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // API Route for Printing
  app.post("/api/print", async (req, res) => {
    const { printer, data } = req.body;
    
    if (!printer || !printer.address) {
      return res.status(400).json({ error: "No printer address provided" });
    }

    const ip = printer.address;
    const port = printer.port || 515; // Default LPR port
    const queue = "lp1"; // Common default queue for StarTech print servers

    try {
      const commands = generateEscPos(data);
      
      // LPR Protocol Implementation (RFC 1179)
      const socket = new net.Socket();
      socket.setTimeout(10000);

      const sendCommand = (cmd: Buffer) => new Promise<void>((resolve, reject) => {
        socket.write(cmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const waitForAck = () => new Promise<void>((resolve, reject) => {
        socket.once('data', (chunk) => {
          if (chunk[0] === 0) resolve();
          else reject(new Error(`Printer returned error code: ${chunk[0]}`));
        });
      });

      socket.connect(port, ip, async () => {
        try {
          // 1. Receive a printer job
          await sendCommand(Buffer.from(`\x02${queue}\n`));
          await waitForAck();

          // 2. Receive control file
          const controlFile = `Hlocalhost\nProot\n`;
          await sendCommand(Buffer.from(`\x02${controlFile.length} cfA001localhost\n`));
          await waitForAck();
          await sendCommand(Buffer.concat([Buffer.from(controlFile), Buffer.from("\x00")]));
          await waitForAck();

          // 3. Receive data file
          await sendCommand(Buffer.from(`\x03${commands.length} dfA001localhost\n`));
          await waitForAck();
          await sendCommand(Buffer.concat([commands, Buffer.from("\x00")]));
          await waitForAck();

          socket.end();
          res.json({ success: true });
        } catch (err: any) {
          socket.destroy();
          res.status(500).json({ error: `LPR Protocol Error: ${err.message}` });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        res.status(500).json({ error: `Connection error: ${err.message}` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        res.status(500).json({ error: "Connection timeout" });
      });

    } catch (error: any) {
      console.error("Printing error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to generate ESC/POS commands
  function generateEscPos(data: any) {
    const init = Buffer.from("\x1B\x40");
    const center = Buffer.from("\x1B\x61\x01");
    const boldOn = Buffer.from("\x1B\x45\x01");
    const boldOff = Buffer.from("\x1B\x45\x00");
    const sizeLarge = Buffer.from("\x1D\x21\x11");
    const sizeNormal = Buffer.from("\x1D\x21\x00");
    const cut = Buffer.from("\x1D\x56\x00");
    const feed = Buffer.from("\n\n\n");

    const header = Buffer.concat([
      init,
      center,
      boldOn,
      Buffer.from("GESFIL\n"),
      boldOff,
      Buffer.from("Sistema de Gestion de Fila\n\n"),
      Buffer.from("SU TURNO ES\n"),
      sizeLarge,
      Buffer.from(`${data.prefix} ${data.number}\n`),
      sizeNormal,
      Buffer.from(data.isPriority ? "--- PREFERENTE ---\n" : ""),
      Buffer.from("\n"),
      boldOn,
      Buffer.from("AREA DE ATENCION\n"),
      boldOff,
      Buffer.from(`${data.serviceName}\n\n`),
      Buffer.from(`${data.date} - ${data.time}\n`),
      Buffer.from("Gracias por su visita\n"),
      feed,
      cut
    ]);

    return header;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
