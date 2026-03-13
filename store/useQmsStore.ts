
import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Service, Station, QmsState, User, UserRole, Printer, PrinterType } from '../types';
import { INITIAL_SERVICES, INITIAL_STATIONS } from '../constants';
import { supabase } from '../services/supabase';

const DEFAULT_USERS: User[] = [
  { id: '00000000-0000-0000-0000-000000000021', username: 'superadmin', password: '123', name: 'Super Administrador', role: UserRole.SUPERADMIN },
  { id: '00000000-0000-0000-0000-000000000022', username: 'admin', password: '123', name: 'Gestor Operativo', role: UserRole.ADMIN },
  { id: '00000000-0000-0000-0000-000000000023', username: 'staff1', password: '123', name: 'Operario 01', role: UserRole.STAFF, assignedStationId: '00000000-0000-0000-0000-000000000011' },
  { id: '00000000-0000-0000-0000-000000000024', username: 'totem', password: '123', name: 'Tótem Entrada', role: UserRole.TOTEM },
  { id: '00000000-0000-0000-0000-000000000025', username: 'live', password: '123', name: 'Display Live', role: UserRole.DISPLAY },
];

// Mapping helpers
const mapServiceFromDb = (s: any): Service => ({
  id: s.id,
  name: s.name,
  prefix: s.prefix,
  color: s.color,
  description: s.description || '',
  active: s.active,
  startTime: s.start_time,
  endTime: s.end_time
});

const mapStationFromDb = (s: any): Station => ({
  id: s.id,
  name: s.name,
  operatorName: s.operator_name || '',
  serviceIds: s.service_ids || [],
  active: s.active
});

const mapTicketFromDb = (t: any): Ticket => ({
  id: t.id,
  code: t.code,
  serviceId: t.service_id,
  status: t.status as TicketStatus,
  createdAt: new Date(t.created_at).getTime(),
  calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
  startedAt: t.started_at ? new Date(t.started_at).getTime() : undefined,
  endedAt: t.ended_at ? new Date(t.ended_at).getTime() : undefined,
  stationId: t.station_id,
  metadata: {
    recalledCount: t.recalled_count || 0,
    priority: t.priority || false
  }
});

const mapUserFromDb = (u: any): User => ({
  id: u.id,
  username: u.username,
  password: u.password,
  name: u.name,
  role: u.role as UserRole,
  assignedStationId: u.assigned_station_id
});

const mapPrinterFromDb = (p: any): Printer => ({
  id: p.id,
  name: p.name,
  type: p.type as PrinterType,
  address: p.address,
  port: p.port,
  active: p.active
});

export const useQmsStore = () => {
  const [state, setState] = useState<QmsState>({
    services: [],
    stations: [],
    tickets: [],
    nextSequence: {},
    users: [],
    currentUser: null,
    printers: []
  });

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Timer to refresh time-based logic (like service availability)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Initial data fetch and Real-time subscriptions
  useEffect(() => {
    const fetchAll = async () => {
      const [
        { data: services },
        { data: stations },
        { data: tickets },
        { data: users },
        { data: printers },
        { data: config }
      ] = await Promise.all([
        supabase.from('services').select('*'),
        supabase.from('stations').select('*'),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase.from('printers').select('*'),
        supabase.from('system_config').select('*').eq('key', 'nextSequence').maybeSingle()
      ]);

      setState(prev => ({
        ...prev,
        services: (services || []).map(mapServiceFromDb),
        stations: (stations || []).map(mapStationFromDb),
        tickets: (tickets || []).map(mapTicketFromDb),
        users: (users || []).map(mapUserFromDb),
        printers: (printers || []).map(mapPrinterFromDb),
        nextSequence: config?.value || {}
      }));
      setLoading(false);
    };

    fetchAll();

    const channel = supabase.channel('qms_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
        setState(prev => {
          const services = [...prev.services];
          if (payload.eventType === 'INSERT') services.push(mapServiceFromDb(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = services.findIndex(s => s.id === payload.new.id);
            if (index !== -1) services[index] = mapServiceFromDb(payload.new);
          }
          if (payload.eventType === 'DELETE') {
            return { ...prev, services: services.filter(s => s.id === payload.old.id) };
          }
          return { ...prev, services };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (payload) => {
        setState(prev => {
          const stations = [...prev.stations];
          if (payload.eventType === 'INSERT') stations.push(mapStationFromDb(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = stations.findIndex(s => s.id === payload.new.id);
            if (index !== -1) stations[index] = mapStationFromDb(payload.new);
          }
          if (payload.eventType === 'DELETE') {
            return { ...prev, stations: stations.filter(s => s.id === payload.old.id) };
          }
          return { ...prev, stations };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        setState(prev => {
          const tickets = [...prev.tickets];
          if (payload.eventType === 'INSERT') tickets.unshift(mapTicketFromDb(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = tickets.findIndex(t => t.id === payload.new.id);
            if (index !== -1) tickets[index] = mapTicketFromDb(payload.new);
          }
          if (payload.eventType === 'DELETE') {
            return { ...prev, tickets: tickets.filter(t => t.id === payload.old.id) };
          }
          return { ...prev, tickets };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        setState(prev => {
          const users = [...prev.users];
          let currentUser = prev.currentUser;
          
          if (payload.eventType === 'INSERT') users.push(mapUserFromDb(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = users.findIndex(u => u.id === payload.new.id);
            const updatedUser = mapUserFromDb(payload.new);
            if (index !== -1) users[index] = updatedUser;
            if (currentUser && currentUser.id === updatedUser.id) {
              currentUser = updatedUser;
            }
          }
          if (payload.eventType === 'DELETE') {
            const filtered = users.filter(u => u.id === payload.old.id);
            if (currentUser && currentUser.id === payload.old.id) currentUser = null;
            return { ...prev, users: filtered, currentUser };
          }
          return { ...prev, users, currentUser };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'printers' }, (payload) => {
        setState(prev => {
          const printers = [...prev.printers];
          if (payload.eventType === 'INSERT') printers.push(mapPrinterFromDb(payload.new));
          if (payload.eventType === 'UPDATE') {
            const index = printers.findIndex(p => p.id === payload.new.id);
            if (index !== -1) printers[index] = mapPrinterFromDb(payload.new);
          }
          if (payload.eventType === 'DELETE') {
            return { ...prev, printers: printers.filter(p => p.id === payload.old.id) };
          }
          return { ...prev, printers };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Session persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('gesfil_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setState(prev => ({ ...prev, currentUser: user }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('gesfil_user', JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem('gesfil_user');
    }
  }, [state.currentUser]);

  // Actions
  const login = useCallback(async (username: string, password?: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password)
      .maybeSingle();

    if (data && !error) {
      const user = mapUserFromDb(data);
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setState(prev => ({ ...prev, currentUser: null })), []);

  const addTicket = useCallback(async (serviceId: string, priority: boolean = false) => {
    const { data: seq, error: seqError } = await supabase.rpc('increment_sequence', { s_id: serviceId });
    if (seqError) {
      console.error('Error incrementing sequence:', seqError);
      return null;
    }

    const service = state.services.find(s => s.id === serviceId);
    if (!service) return null;

    const code = `${service.prefix}${seq.toString().padStart(3, '0')}`;

    const { data, error } = await supabase.from('tickets').insert({
      code,
      service_id: serviceId,
      status: TicketStatus.WAITING,
      priority
    }).select().single();

    if (error) {
      console.error('Error adding ticket:', error);
      return null;
    }

    return mapTicketFromDb(data);
  }, [state.services]);

  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: TicketStatus, stationId: string) => {
    const ticket = state.tickets.find(t => t.id === ticketId);
    const station = state.stations.find(s => s.id === stationId);
    
    if (!ticket || !station) return;

    // Security: Validate module handles this service
    if (!station.serviceIds.includes(ticket.serviceId)) {
      alert('Este módulo no está autorizado para atender este servicio.');
      return;
    }

    // State Machine Transitions
    const currentStatus = ticket.status;
    
    // Validation: Can't call if already has an active ticket (unless it's a recall)
    if (newStatus === TicketStatus.CALLING) {
      const hasActive = state.tickets.some(t => 
        t.stationId === stationId && 
        t.id !== ticketId &&
        (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)
      );
      if (hasActive) {
        alert('Ya tienes un ticket activo. Finalízalo antes de llamar a otro.');
        return;
      }
    }

    // Transition Logic
    const updates: any = { status: newStatus };

    if (newStatus === TicketStatus.CALLING) {
      if (currentStatus !== TicketStatus.WAITING && currentStatus !== TicketStatus.CALLING) return;
      updates.called_at = new Date().toISOString();
      updates.station_id = stationId;
      updates.recalled_count = (ticket.metadata?.recalledCount || 0) + 1;
    } else if (newStatus === TicketStatus.ATTENDING) {
      if (currentStatus !== TicketStatus.CALLING) return;
      updates.started_at = new Date().toISOString();
    } else if (newStatus === TicketStatus.COMPLETED || newStatus === TicketStatus.CANCELLED) {
      if (newStatus === TicketStatus.COMPLETED && currentStatus !== TicketStatus.ATTENDING) return;
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase.from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .eq('status', currentStatus); // Atomic update: ensure status hasn't changed
      
    if (error) {
      console.error('Error updating ticket status:', error);
      // If error is related to condition not met, it means someone else updated it
      if (error.code === 'PGRST116') {
        alert('El ticket ya ha sido actualizado por otro usuario.');
      }
    }
  }, [state.tickets, state.stations]);

  const addUser = useCallback(async (u: Omit<User, 'id'>) => {
    await supabase.from('users').insert({
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role,
      assigned_station_id: u.assignedStationId
    });
  }, []);

  const updateUser = useCallback(async (id: string, u: Partial<User>) => {
    const updates: any = { ...u };
    if (u.assignedStationId !== undefined) updates.assigned_station_id = u.assignedStationId;
    
    // Security: If role changes from STAFF, clear station assignment
    if (u.role && u.role !== UserRole.STAFF) {
      updates.assigned_station_id = null;
    }

    await supabase.from('users').update(updates).eq('id', id);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
  }, []);

  const addService = useCallback(async (s: Omit<Service, 'id'>) => {
    await supabase.from('services').insert({
      name: s.name,
      prefix: s.prefix,
      color: s.color,
      description: s.description,
      active: s.active,
      start_time: s.startTime,
      end_time: s.endTime
    });
  }, []);

  const updateService = useCallback(async (id: string, s: Partial<Service>) => {
    const updates: any = { ...s };
    if (s.startTime !== undefined) updates.start_time = s.startTime;
    if (s.endTime !== undefined) updates.end_time = s.endTime;
    await supabase.from('services').update(updates).eq('id', id);
  }, []);

  const deleteService = useCallback(async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
  }, []);

  const addStation = useCallback(async (s: Omit<Station, 'id'>) => {
    await supabase.from('stations').insert({
      name: s.name,
      operator_name: s.operatorName,
      service_ids: s.serviceIds,
      active: s.active
    });
  }, []);

  const updateStation = useCallback(async (id: string, s: Partial<Station>) => {
    const updates: any = { ...s };
    if (s.operatorName !== undefined) updates.operator_name = s.operatorName;
    if (s.serviceIds !== undefined) updates.service_ids = s.serviceIds;
    await supabase.from('stations').update(updates).eq('id', id);
  }, []);

  const deleteStation = useCallback(async (id: string) => {
    await supabase.from('stations').delete().eq('id', id);
  }, []);

  const addPrinter = useCallback(async (pr: Omit<Printer, 'id'>) => {
    await supabase.from('printers').insert(pr);
  }, []);

  const updatePrinter = useCallback(async (id: string, pr: Partial<Printer>) => {
    await supabase.from('printers').update(pr).eq('id', id);
  }, []);

  const deletePrinter = useCallback(async (id: string) => {
    await supabase.from('printers').delete().eq('id', id);
  }, []);

  const resetSystem = useCallback(async () => {
    if (confirm("¿Confirmar purga diaria? Esta acción reiniciará los turnos a 101 y vaciará la base de datos de tickets del día.")) {
      await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('system_config').upsert({ key: 'nextSequence', value: {} });
    }
  }, []);

  const isServiceActive = useCallback((service: Service) => {
    if (!service.active) return false;
    if (!service.startTime && !service.endTime) return true;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (service.startTime && currentTime < service.startTime) return false;
    if (service.endTime && currentTime > service.endTime) return false;

    return true;
  }, [tick]);

  const seedDatabase = useCallback(async () => {
    setLoading(true);
    try {
      // Clear existing data
      await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('users').delete().neq('username', 'superadmin');

      // Insert initial data
      await supabase.from('services').insert(INITIAL_SERVICES.map(s => ({
        id: s.id,
        name: s.name,
        prefix: s.prefix,
        color: s.color,
        description: s.description,
        active: s.active,
        start_time: s.startTime,
        end_time: s.endTime
      })));

      await supabase.from('stations').insert(INITIAL_STATIONS.map(s => ({
        id: s.id,
        name: s.name,
        operator_name: s.operatorName,
        service_ids: s.serviceIds,
        active: s.active
      })));

      // Default users
      await supabase.from('users').upsert(DEFAULT_USERS.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        assigned_station_id: u.assignedStationId
      })));

      await supabase.from('system_config').upsert({ key: 'nextSequence', value: {} });

      alert('Base de datos inicializada con éxito en Supabase.');
    } catch (error) {
      console.error('Error seeding database:', error);
      alert('Error al inicializar la base de datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    state, loading, login, logout, addTicket, updateTicketStatus, resetSystem, seedDatabase,
    addUser, updateUser, deleteUser, addService, updateService, deleteService, 
    addStation, updateStation, deleteStation, isServiceActive,
    addPrinter, updatePrinter, deletePrinter,
    isInitialized: state.users.length > 0
  };
};

