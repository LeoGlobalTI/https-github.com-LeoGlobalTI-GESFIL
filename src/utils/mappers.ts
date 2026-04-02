import { Ticket, TicketStatus, Service, Station, User, UserRole, Printer, PrinterType } from '@/types';

export const mapServiceFromDb = (s: any): Service => ({
  id: s.id,
  name: s.name,
  prefix: s.prefix,
  color: s.color,
  description: s.description || '',
  active: s.active
});

export const mapStationFromDb = (s: any): Station => ({
  id: s.id,
  name: s.name,
  operatorName: s.operator_name || '',
  serviceIds: s.service_ids || [],
  serviceConfigs: s.service_configs || {},
  active: s.active
});

export const mapTicketFromDb = (t: any): Ticket => {
  const createdAtDate = new Date(t.created_at).getTime();
  const calledAtDate = t.called_at ? new Date(t.called_at).getTime() : undefined;
  const startedAtDate = t.started_at ? new Date(t.started_at).getTime() : undefined;
  const endedAtDate = t.ended_at ? new Date(t.ended_at).getTime() : undefined;

  return {
    id: t.id,
    code: t.code,
    serviceId: t.service_id,
    status: (t.status || '').toUpperCase() as TicketStatus,
    createdAt: isNaN(createdAtDate) ? Date.now() : createdAtDate,
    calledAt: (calledAtDate !== undefined && !isNaN(calledAtDate)) ? calledAtDate : undefined,
    startedAt: (startedAtDate !== undefined && !isNaN(startedAtDate)) ? startedAtDate : undefined,
    endedAt: (endedAtDate !== undefined && !isNaN(endedAtDate)) ? endedAtDate : undefined,
    stationId: t.station_id,
    metadata: {
      recalledCount: t.recalled_count || 0,
      priority: t.priority || false
    }
  };
};

export const mapUserFromDb = (u: any): User => ({
  id: u.id,
  username: u.username,
  password: u.password,
  name: u.name,
  role: (u.role || '').toUpperCase() as UserRole,
  assignedStationId: u.assigned_station_id
});

export const mapPrinterFromDb = (p: any): Printer => {
  const parsedPort = p.port ? parseInt(p.port) : undefined;
  return {
    id: p.id,
    name: p.name,
    type: p.type as PrinterType,
    address: p.address,
    port: (typeof p.port === 'number' && !isNaN(p.port)) ? p.port : (parsedPort && !isNaN(parsedPort) ? parsedPort : undefined),
    active: p.active
  };
};
