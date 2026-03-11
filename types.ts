
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
  TOTEM = 'TOTEM'
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
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
}

export interface Station {
  id: string;
  name: string;
  operatorName: string;
  serviceIds: string[];
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

export interface QmsState {
  services: Service[];
  stations: Station[];
  tickets: Ticket[];
  nextSequence: Record<string, number>;
  users: User[];
  currentUser: User | null;
}
