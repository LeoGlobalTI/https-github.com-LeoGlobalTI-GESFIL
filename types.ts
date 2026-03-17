
export enum TicketStatus {
  WAITING = 'WAITING',
  CALLING = 'CALLING',
  ATTENDING = 'ATTENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  TOTEM = 'TOTEM',
  DISPLAY = 'DISPLAY'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  assignedStationId?: string;
}

export interface Service {
  id: string;
  name: string;
  prefix: string;
  color: string;
  description: string;
  active: boolean;
}

export interface StationServiceConfig {
  serviceId: string;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
}

export interface Station {
  id: string;
  name: string;
  operatorName: string;
  serviceIds: string[];
  serviceConfigs?: Record<string, { startTime?: string, endTime?: string }>;
  active: boolean;
}

export interface Ticket {
  id: string;
  code: string;
  serviceId: string;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  startedAt?: number;
  endedAt?: number;
  stationId?: string;
  metadata?: {
    recalledCount?: number;
    priority?: boolean;
    notes?: string;
  };
}

export enum PrinterType {
  USB = 'USB',
  NETWORK = 'NETWORK',
  BROWSER = 'BROWSER'
}

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  address?: string; // IP or USB ID
  port?: number;
  active: boolean;
}

export interface QmsState {
  services: Service[];
  stations: Station[];
  tickets: Ticket[];
  nextSequence: Record<string, number>;
  users: User[];
  currentUser: User | null;
  printers: Printer[];
}
