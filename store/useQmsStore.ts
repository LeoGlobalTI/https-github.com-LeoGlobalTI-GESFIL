
import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Service, Station, QmsState, User, UserRole, Printer, PrinterType } from '../types';
import { INITIAL_SERVICES, INITIAL_STATIONS } from '../constants';

const DEFAULT_USERS: User[] = [
  { id: 'u1', username: 'superadmin', password: '123', name: 'Super Administrador', role: UserRole.SUPERADMIN },
  { id: 'u2', username: 'admin', password: '123', name: 'Gestor Operativo', role: UserRole.ADMIN },
  { id: 'u3', username: 'staff1', password: '123', name: 'Operario 01', role: UserRole.STAFF, assignedStationId: 's1' },
  { id: 'u4', username: 'totem', password: '123', name: 'Tótem Entrada', role: UserRole.TOTEM },
  { id: 'u5', username: 'live', password: '123', name: 'Display Live', role: UserRole.DISPLAY },
];

const STORAGE_KEY = 'gesfil_qms_v2_core';

export const useQmsStore = () => {
  const getInitialState = (): QmsState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          services: (parsed.services || INITIAL_SERVICES).map((s: any) => ({
            ...s,
            active: typeof s.active === 'boolean' ? s.active : true
          })),
          stations: (parsed.stations || INITIAL_STATIONS).map((s: any) => ({
            ...s,
            active: typeof s.active === 'boolean' ? s.active : true,
            serviceIds: Array.isArray(s.serviceIds) ? s.serviceIds : []
          })),
          users: (parsed.users || DEFAULT_USERS).map((u: any) => ({
            ...u,
            role: Object.values(UserRole).includes(u.role) ? u.role : UserRole.STAFF
          })),
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
          currentUser: parsed.currentUser || null,
          nextSequence: parsed.nextSequence || {},
          printers: Array.isArray(parsed.printers) ? parsed.printers : []
        };
      }
    } catch (e) {
      console.error("Storage Recovery Error:", e);
    }
    return {
      services: INITIAL_SERVICES,
      stations: INITIAL_STATIONS,
      tickets: [],
      nextSequence: INITIAL_SERVICES.reduce((acc, s) => ({ ...acc, [s.id]: 101 }), {}),
      users: DEFAULT_USERS,
      currentUser: null,
      printers: []
    };
  };

  const [state, setState] = useState<QmsState>(getInitialState);

  // Sincronización Multi-Pestaña (Crucial para QMS en red local)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = useCallback((username: string, password?: string) => {
    const user = state.users.find(u => 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      u.password === password
    );
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  }, [state.users]);

  const logout = useCallback(() => setState(prev => ({ ...prev, currentUser: null })), []);

  const isServiceActive = useCallback((service: Service) => {
    if (!service.active) return false;
    if (!service.startTime && !service.endTime) return true;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (service.startTime && currentTime < service.startTime) return false;
    if (service.endTime && currentTime > service.endTime) return false;

    return true;
  }, []);

  const addTicket = useCallback((serviceId: string, priority: boolean = false) => {
    setState(prev => {
      const service = prev.services.find(s => s.id === serviceId);
      if (!service || !isServiceActive(service)) return prev;
      
      const sequence = prev.nextSequence[serviceId] || 101;
      const newTicket: Ticket = {
        id: crypto.randomUUID(),
        code: `${service.prefix}-${sequence}`,
        serviceId,
        status: TicketStatus.WAITING,
        createdAt: Date.now(),
        metadata: { recalledCount: 0, priority }
      };

      return {
        ...prev,
        tickets: [...prev.tickets, newTicket],
        nextSequence: { ...prev.nextSequence, [serviceId]: sequence + 1 }
      };
    });
  }, [isServiceActive]);

  const updateTicketStatus = useCallback((ticketId: string, newStatus: TicketStatus, stationId: string) => {
    setState(prev => {
      const index = prev.tickets.findIndex(t => t.id === ticketId);
      if (index === -1) return prev;
      
      const ticket = prev.tickets[index];
      const station = prev.stations.find(s => s.id === stationId);

      // Bloqueo de Seguridad: No permitir llamar tickets si el módulo no está activo
      if (station && !station.active && newStatus === TicketStatus.CALLING) return prev;

      // Validación de Seguridad: Un ticket ya en atención no puede ser capturado por otro módulo
      if (newStatus === TicketStatus.CALLING && ticket.status !== TicketStatus.WAITING && ticket.stationId !== stationId) {
        return prev;
      }

      // Máquina de Estados Definida
      const isLegal = 
        (ticket.status === TicketStatus.WAITING && newStatus === TicketStatus.CALLING) ||
        (ticket.status === TicketStatus.CALLING && [TicketStatus.CALLING, TicketStatus.ATTENDING, TicketStatus.CANCELLED].includes(newStatus)) ||
        (ticket.status === TicketStatus.ATTENDING && [TicketStatus.COMPLETED, TicketStatus.CANCELLED].includes(newStatus));

      if (!isLegal) return prev;

      const updatedTickets = [...prev.tickets];
      const updates: Partial<Ticket> = { status: newStatus };

      if (newStatus === TicketStatus.CALLING) {
        updates.calledAt = Date.now();
        updates.stationId = stationId;
        updates.metadata = { 
          ...ticket.metadata, 
          recalledCount: (ticket.metadata?.recalledCount || 0) + 1 
        };
      } else if (newStatus === TicketStatus.ATTENDING) {
        updates.startedAt = ticket.startedAt || Date.now();
      } else if ([TicketStatus.COMPLETED, TicketStatus.CANCELLED].includes(newStatus)) {
        updates.endedAt = Date.now();
      }

      updatedTickets[index] = { ...ticket, ...updates };
      return { ...prev, tickets: updatedTickets };
    });
  }, []);

  const addUser = (u: Omit<User, 'id'>) => setState(p => ({ ...p, users: [...p.users, { ...u, id: crypto.randomUUID() }] }));
  
  const updateUser = (id: string, u: Partial<User>) => setState(p => {
    const updatedUsers = p.users.map(x => {
      if (x.id === id) {
        const newUser = { ...x, ...u };
        if (newUser.role !== UserRole.STAFF) newUser.assignedStationId = undefined;
        return newUser;
      }
      return x;
    });
    return { ...p, users: updatedUsers };
  });

  const deleteUser = (id: string) => setState(p => ({ ...p, users: p.users.filter(x => x.id !== id) }));

  const addService = (s: Omit<Service, 'id'>) => {
    const id = crypto.randomUUID();
    setState(p => ({ ...p, services: [...p.services, { ...s, id }], nextSequence: { ...p.nextSequence, [id]: 101 } }));
  };

  const updateService = useCallback((id: string, s: Partial<Service>) => setState(p => ({ ...p, services: p.services.map(x => x.id === id ? { ...x, ...s } : x) })), []);

  const deleteService = (id: string) => setState(p => ({
    ...p,
    services: p.services.filter(x => x.id !== id),
    tickets: p.tickets.filter(t => t.serviceId !== id), // Limpiar tickets huérfanos
    stations: p.stations.map(st => ({ ...st, serviceIds: st.serviceIds.filter(sid => sid !== id) }))
  }));

  const addStation = (s: Omit<Station, 'id'>) => setState(p => ({ ...p, stations: [...p.stations, { ...s, id: crypto.randomUUID() }] }));

  const updateStation = (id: string, s: Partial<Station>) => setState(p => ({ ...p, stations: p.stations.map(x => x.id === id ? { ...x, ...s } : x) }));

  const deleteStation = (id: string) => setState(p => ({ 
    ...p, 
    stations: p.stations.filter(x => x.id !== id),
    users: p.users.map(u => u.assignedStationId === id ? { ...u, assignedStationId: undefined } : u)
  }));
  
  const addPrinter = (pr: Omit<Printer, 'id'>) => setState(p => ({ ...p, printers: [...p.printers, { ...pr, id: crypto.randomUUID() }] }));
  
  const updatePrinter = (id: string, pr: Partial<Printer>) => setState(p => ({ ...p, printers: p.printers.map(x => x.id === id ? { ...x, ...pr } : x) }));
  
  const deletePrinter = (id: string) => setState(p => ({ ...p, printers: p.printers.filter(x => x.id !== id) }));

  const resetSystem = () => {
    if (confirm("¿Confirmar purga diaria? Esta acción reiniciará los turnos a 101 y vaciará la base de datos de tickets del día.")) {
      setState(p => ({ 
        ...p, 
        tickets: [], 
        nextSequence: p.services.reduce((acc, s) => ({ ...acc, [s.id]: 101 }), {}) 
      }));
    }
  };

  return { 
    state, login, logout, addTicket, updateTicketStatus, resetSystem, 
    addUser, updateUser, deleteUser, addService, updateService, deleteService, 
    addStation, updateStation, deleteStation, isServiceActive,
    addPrinter, updatePrinter, deletePrinter
  };
};
