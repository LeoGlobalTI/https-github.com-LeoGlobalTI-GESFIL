
import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Service, Station, QmsState, User, UserRole, Printer } from '../types';
import { supabase } from '../services/supabase';
import { INITIAL_SERVICES, INITIAL_STATIONS } from '../constants';

const DEFAULT_USERS: Omit<User, 'id'>[] = [
  { username: 'superadmin', password: '123', name: 'Super Administrador', role: UserRole.SUPERADMIN },
  { username: 'admin', password: '123', name: 'Gestor Operativo', role: UserRole.ADMIN },
  { username: 'staff1', password: '123', name: 'Operario 01', role: UserRole.STAFF, assignedStationId: '00000000-0000-0000-0000-000000000011' },
  { username: 'totem', password: '123', name: 'Tótem Entrada', role: UserRole.TOTEM },
  { username: 'live', password: '123', name: 'Display Live', role: UserRole.DISPLAY },
];

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

  // Fetch Initial Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        { data: services },
        { data: stations },
        { data: tickets },
        { data: users },
        { data: printers },
        { data: config }
      ] = await Promise.all([
        supabase.from('services').select('*').order('name'),
        supabase.from('stations').select('*').order('name'),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase.from('printers').select('*'),
        supabase.from('system_config').select('*').eq('key', 'nextSequence').single()
      ]);

      setState(prev => ({
        ...prev,
        services: services || [],
        stations: (stations || []).map(s => ({
          ...s,
          serviceIds: s.service_ids || [] // Map snake_case to camelCase if needed, but schema uses service_ids
        })),
        tickets: (tickets || []).map(t => ({
          ...t,
          createdAt: new Date(t.created_at).getTime(),
          calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
          startedAt: t.started_at ? new Date(t.started_at).getTime() : undefined,
          endedAt: t.ended_at ? new Date(t.ended_at).getTime() : undefined,
          serviceId: t.service_id,
          stationId: t.station_id,
          metadata: { recalledCount: t.recalled_count, priority: t.priority }
        })),
        users: (users || []).map(u => ({
          ...u,
          assignedStationId: u.assigned_station_id
        })),
        printers: printers || [],
        nextSequence: config?.value || {}
      }));
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime Subscriptions
    const channels = [
      supabase.channel('services').on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchData),
      supabase.channel('stations').on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, fetchData),
      supabase.channel('tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchData),
      supabase.channel('users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchData),
      supabase.channel('printers').on('postgres_changes', { event: '*', schema: 'public', table: 'printers' }, fetchData),
      supabase.channel('system_config').on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchData)
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchData]);

  // Actions
  const login = useCallback(async (username: string, password?: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .single();

    if (data && !error) {
      const user: User = {
        ...data,
        assignedStationId: data.assigned_station_id
      };
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setState(prev => ({ ...prev, currentUser: null })), []);

  const addTicket = useCallback(async (serviceId: string, priority: boolean = false) => {
    const service = state.services.find(s => s.id === serviceId);
    if (!service) return null;

    // Call RPC to get next sequence atomically
    const { data: sequence, error: rpcError } = await supabase.rpc('increment_sequence', { s_id: serviceId });
    
    if (rpcError) {
      console.error('Error incrementing sequence:', rpcError);
      return null;
    }

    const newTicket = {
      code: `${service.prefix}${sequence.toString().padStart(3, '0')}`,
      service_id: serviceId,
      status: TicketStatus.WAITING,
      priority,
      recalled_count: 0
    };

    const { data, error } = await supabase.from('tickets').insert(newTicket).select().single();

    if (error) {
      console.error('Error adding ticket:', error);
      return null;
    }

    return {
      ...data,
      createdAt: new Date(data.created_at).getTime(),
      serviceId: data.service_id,
      metadata: { recalledCount: data.recalled_count, priority: data.priority }
    } as Ticket;
  }, [state.services]);

  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: TicketStatus, stationId: string) => {
    const updates: any = { status: newStatus };

    if (newStatus === TicketStatus.CALLING) {
      updates.called_at = new Date().toISOString();
      updates.station_id = stationId;
      // Recalled count increment is handled by fetching current state or we could do it in SQL
      const ticket = state.tickets.find(t => t.id === ticketId);
      if (ticket) {
        updates.recalled_count = (ticket.metadata?.recalledCount || 0) + 1;
      }
    } else if (newStatus === TicketStatus.ATTENDING) {
      updates.started_at = new Date().toISOString();
    } else if ([TicketStatus.COMPLETED, TicketStatus.CANCELLED].includes(newStatus)) {
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) console.error('Error updating ticket status:', error);
  }, [state.tickets]);

  const addUser = async (u: Omit<User, 'id'>) => {
    const { error } = await supabase.from('users').insert({
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role,
      assigned_station_id: u.assignedStationId
    });
    if (error) console.error('Error adding user:', error);
  };

  const updateUser = async (id: string, u: Partial<User>) => {
    const updates: any = { ...u };
    if (u.assignedStationId !== undefined) {
      updates.assigned_station_id = u.assignedStationId;
      delete updates.assignedStationId;
    }
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) console.error('Error updating user:', error);
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error('Error deleting user:', error);
  };

  const addService = async (s: Omit<Service, 'id'>) => {
    const { error } = await supabase.from('services').insert({
      name: s.name,
      prefix: s.prefix,
      color: s.color,
      description: s.description,
      active: s.active,
      start_time: s.startTime,
      end_time: s.endTime
    });
    if (error) console.error('Error adding service:', error);
  };

  const updateService = async (id: string, s: Partial<Service>) => {
    const updates: any = { ...s };
    if (s.startTime !== undefined) {
      updates.start_time = s.startTime;
      delete updates.startTime;
    }
    if (s.endTime !== undefined) {
      updates.end_time = s.endTime;
      delete updates.endTime;
    }
    const { error } = await supabase.from('services').update(updates).eq('id', id);
    if (error) console.error('Error updating service:', error);
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) console.error('Error deleting service:', error);
  };

  const addStation = async (s: Omit<Station, 'id'>) => {
    const { error } = await supabase.from('stations').insert({
      name: s.name,
      operator_name: s.operatorName,
      service_ids: s.serviceIds,
      active: s.active
    });
    if (error) console.error('Error adding station:', error);
  };

  const updateStation = async (id: string, s: Partial<Station>) => {
    const updates: any = { ...s };
    if (s.operatorName !== undefined) {
      updates.operator_name = s.operatorName;
      delete updates.operatorName;
    }
    if (s.serviceIds !== undefined) {
      updates.service_ids = s.serviceIds;
      delete updates.serviceIds;
    }
    const { error } = await supabase.from('stations').update(updates).eq('id', id);
    if (error) console.error('Error updating station:', error);
  };

  const deleteStation = async (id: string) => {
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (error) console.error('Error deleting station:', error);
  };

  const addPrinter = async (pr: Omit<Printer, 'id'>) => {
    const { error } = await supabase.from('printers').insert(pr);
    if (error) console.error('Error adding printer:', error);
  };

  const updatePrinter = async (id: string, pr: Partial<Printer>) => {
    const { error } = await supabase.from('printers').update(pr).eq('id', id);
    if (error) console.error('Error updating printer:', error);
  };

  const deletePrinter = async (id: string) => {
    const { error } = await supabase.from('printers').delete().eq('id', id);
    if (error) console.error('Error deleting printer:', error);
  };

  const resetSystem = async () => {
    if (confirm("¿Confirmar purga diaria? Esta acción reiniciará los turnos a 101 y vaciará la base de datos de tickets del día.")) {
      const { error: deleteError } = await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      const { error: configError } = await supabase.from('system_config').update({ value: {} }).eq('key', 'nextSequence');
      
      if (deleteError || configError) console.error('Error resetting system:', deleteError || configError);
    }
  };

  const isServiceActive = useCallback((service: Service) => {
    if (!service.active) return false;
    if (!service.startTime && !service.endTime) return true;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (service.startTime && currentTime < service.startTime) return false;
    if (service.endTime && currentTime > service.endTime) return false;

    return true;
  }, []);

  const seedDatabase = async () => {
    try {
      setLoading(true);
      console.log('Iniciando inicialización de base de datos...');

      // 1. Seed Services
      const { data: existingServices, error: serviceError } = await supabase.from('services').select('id');
      if (serviceError) throw new Error(`Error al consultar servicios: ${serviceError.message}`);

      // Use upsert to be idempotent
      const { error: insertServiceError } = await supabase.from('services').upsert(INITIAL_SERVICES.map(s => ({
        id: s.id,
        name: s.name,
        prefix: s.prefix,
        color: s.color,
        description: s.description,
        active: s.active
      })), { onConflict: 'name' });
      
      if (insertServiceError) throw new Error(`Error al sincronizar servicios: ${insertServiceError.message}`);
      console.log('Servicios sincronizados.');

      // 2. Seed Stations
      const { data: existingStations, error: stationError } = await supabase.from('stations').select('id');
      if (stationError) throw new Error(`Error al consultar módulos: ${stationError.message}`);

      const { error: insertStationError } = await supabase.from('stations').upsert(INITIAL_STATIONS.map(s => ({
        id: s.id,
        name: s.name,
        operator_name: s.operatorName,
        service_ids: s.serviceIds,
        active: s.active
      })), { onConflict: 'name' });
      
      if (insertStationError) throw new Error(`Error al sincronizar módulos: ${insertStationError.message}`);
      console.log('Módulos sincronizados.');

      // 3. Seed Users
      const { error: insertUserError } = await supabase.from('users').upsert(DEFAULT_USERS.map(u => ({
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        assigned_station_id: u.assignedStationId
      })), { onConflict: 'username' });
      
      if (insertUserError) throw new Error(`Error al sincronizar usuarios: ${insertUserError.message}`);
      console.log('Usuarios sincronizados.');

      // 4. Seed System Config
      const { data: existingConfig, error: configError } = await supabase.from('system_config').select('key').eq('key', 'nextSequence').single();
      
      if (configError && configError.code !== 'PGRST116') { // PGRST116 is "no rows found"
        throw new Error(`Error al consultar configuración: ${configError.message}`);
      }

      if (!existingConfig) {
        const { error: insertConfigError } = await supabase.from('system_config').insert({ key: 'nextSequence', value: {} });
        if (insertConfigError) throw new Error(`Error al insertar configuración: ${insertConfigError.message}`);
        console.log('Configuración insertada.');
      }

      await fetchData();
      alert('Base de datos inicializada con éxito. Ya puedes entrar con superadmin / 123');
    } catch (error: any) {
      console.error('Error seeding database:', error);
      alert(`Error al inicializar: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return { 
    state, loading, login, logout, addTicket, updateTicketStatus, resetSystem, seedDatabase,
    addUser, updateUser, deleteUser, addService, updateService, deleteService, 
    addStation, updateStation, deleteStation, isServiceActive,
    addPrinter, updatePrinter, deletePrinter
  };
};
