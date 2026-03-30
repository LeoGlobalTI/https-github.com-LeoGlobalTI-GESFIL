
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useQmsStore } from '@/state/useQmsStore';
import { ICONS } from '@/constants';
import { UserRole, User, Service, Station, QmsState, Ticket, TicketStatus, Printer } from '@/types';
import ConfirmationModal from '@/components/ConfirmationModal';
import TotemView from '@/components/TotemView';
import StaffView from '@/components/StaffView';
import DashboardView from '@/components/DashboardView';
import TechnicalInfoView from '@/components/TechnicalInfoView';
import PublicDisplayView from '@/components/PublicDisplayView';
import LoginViewComponent from '@/components/LoginViewComponent';
import UserManagementView from '@/components/UserManagementView';
import ServiceManagementView from '@/components/ServiceManagementView';
import StationManagementView from '@/components/StationManagementView';
import PrinterManagementView from '@/components/PrinterManagementView';

const Nav: React.FC<{ role: UserRole, logout: () => void, currentUser: User }> = ({ role, logout, currentUser }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const canSee = (targetRole: UserRole[]) => targetRole.includes(role);

  return (
    <nav className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 dock-nav text-white px-4 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[3rem] shadow-2xl z-50 flex items-center gap-4 md:gap-10 w-[90%] md:w-auto justify-center">
      <div className="flex items-center gap-4 pr-4 md:pr-8 border-r border-white/10 hidden sm:flex">
         <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-base md:text-lg">
           {currentUser.name[0]}
         </div>
         <div className="hidden md:block">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Session</p>
            <p className="text-[13px] font-bold tracking-tight">{currentUser.username}</p>
         </div>
      </div>

      <div className="flex items-center gap-6 md:gap-8">
        {canSee([UserRole.TOTEM, UserRole.ADMIN, UserRole.SUPERADMIN]) && (
          <Link title="Totem" to="/" className={`flex flex-col items-center gap-1.5 transition-all group ${isActive('/') ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
            <ICONS.Terminal />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${isActive('/') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Totem</span>
          </Link>
        )}
        {canSee([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERADMIN]) && (
          <Link title="Módulo" to="/staff" className={`flex flex-col items-center gap-1.5 transition-all group ${isActive('/staff') ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
            <ICONS.Users />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${isActive('/staff') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Staff</span>
          </Link>
        )}
        {canSee([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF, UserRole.TOTEM, UserRole.DISPLAY]) && (
          <Link title="Monitor" to="/display" className={`flex flex-col items-center gap-1.5 transition-all group ${isActive('/display') ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
            <ICONS.Screen />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${isActive('/display') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Live</span>
          </Link>
        )}
        {canSee([UserRole.ADMIN, UserRole.SUPERADMIN]) && (
          <Link title="Admin" to="/admin" className={`flex flex-col items-center gap-1.5 transition-all group ${isActive('/admin') ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-white'}`}>
            <ICONS.Activity />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${isActive('/admin') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>BI Hub</span>
          </Link>
        )}
      </div>
      
      <button 
        onClick={logout}
        className="w-11 h-11 rounded-[1.25rem] bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-xl shadow-rose-950/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </nav>
  );
};

const AdminPanel: React.FC<{ 
  state: QmsState,
  reset: () => void, 
  seed: () => void,
  userRole: UserRole, 
  users: User[],
  onAddUser: (u: Omit<User, 'id'>) => void,
  onUpdateUser: (id: string, u: Partial<User>) => void,
  onDeleteUser: (id: string) => void,
  services: Service[],
  onAddService: (s: Omit<Service, 'id'>) => void,
  onUpdateService: (id: string, s: Partial<Service>) => void,
  onDeleteService: (id: string) => void,
  stations: Station[],
  onAddStation: (st: Omit<Station, 'id'>) => void,
  onUpdateStation: (id: string, st: Partial<Station>) => void,
  onDeleteStation: (id: string) => void,
  printers: Printer[],
  onAddPrinter: (p: Omit<Printer, 'id'>) => void,
  onUpdatePrinter: (id: string, p: Partial<Printer>) => void,
  onDeletePrinter: (id: string) => void,
  onToggleService: (id: string, active: boolean) => void
}> = ({ state, reset, seed, userRole, users, onAddUser, onUpdateUser, onDeleteUser, services, onAddService, onUpdateService, onDeleteService, stations, onAddStation, onUpdateStation, onDeleteStation, printers, onAddPrinter, onUpdatePrinter, onDeletePrinter, onToggleService }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'services' | 'stations' | 'analytics' | 'printers'>('users');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-8 animate-fade-in pb-40">
      <ConfirmationModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={reset}
        title="Purgar Sistema"
        message="¿Confirmar purga diaria? Esta acción eliminará todos los tickets y reiniciará los turnos a 0001."
      />
      <ConfirmationModal 
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
        onConfirm={() => {
          setShowSeedModal(false);
          seed();
        }}
        title="Inicializar Base de Datos"
        message="¿Está seguro de que desea inicializar la base de datos? Esta acción eliminará TODOS los datos actuales (tickets, módulos, servicios, usuarios excepto superadmin) y cargará los datos por defecto. Esta acción es irreversible."
      />
      {/* Superadmin Executive Master Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/5">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-14 h-14 bg-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-4 ring-indigo-500/20">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] leading-none">Global Controller</p>
                  </div>
                  <h1 className="text-4xl font-black tracking-tight">GESFIL Infrastructure Hub</h1>
               </div>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-xl leading-relaxed">
              Panel de administración de nivel empresarial. Controle el flujo de pacientes, gestione operarios y supervise el rendimiento del sistema en tiempo real.
            </p>
          </div>

          <div className="mt-12 flex gap-12 relative z-10">
             {[
               { label: 'Uptime', value: '99.99%', icon: '⚡' },
               { label: 'Payload', value: `${(JSON.stringify(state).length / 1024).toFixed(1)}KB`, icon: '📦' },
               { label: 'Latency', value: '14ms', icon: '🛰️' }
             ].map((stat, i) => (
               <div key={i} className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{stat.label}</span>
                  <span className="text-2xl font-black text-white">{stat.value}</span>
               </div>
             ))}
          </div>
          
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Métricas del Nodo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operadores</p>
                 <p className="text-3xl font-black text-slate-900">{users.length}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Módulos</p>
                 <p className="text-3xl font-black text-slate-900">{stations.length}</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <TechnicalInfoView state={state} isSidebar={false} compact />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Navigation Rail */}
        <aside className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/40 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-5 py-4">Workspace</p>
            <div className="space-y-1.5">
              {[
                { id: 'users', label: 'Operadores', icon: <ICONS.Users />, count: users.length },
                { id: 'services', label: 'Servicios', icon: <ICONS.Activity />, count: services.length },
                { id: 'stations', label: 'Módulos', icon: <ICONS.Terminal />, count: stations.length },
                { id: 'printers', label: 'Impresoras', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>, count: printers.length },
                { id: 'analytics', label: 'BI Hub', icon: <ICONS.Activity />, count: state.tickets.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-[1.75rem] transition-all duration-300 group ${
                    activeTab === tab.id 
                    ? "bg-slate-900 text-white shadow-2xl -translate-y-1" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`transition-transform duration-300 ${activeTab === tab.id ? "text-indigo-400 scale-110" : "text-slate-300 group-hover:text-indigo-500"}`}>
                      {tab.icon}
                    </span>
                    <span className="text-xs font-black tracking-tight">{tab.label}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full transition-colors ${
                    activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5">
             <div className="relative z-10">
               <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Maintenance</h3>
               {userRole === UserRole.SUPERADMIN && (
                 <div className="space-y-3">
                   <button 
                     onClick={() => setShowResetModal(true)}
                     className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 font-black hover:bg-rose-500 hover:text-white transition-all duration-300 uppercase tracking-widest text-[9px]"
                   >
                     Purgar Sistema
                   </button>
                   <button 
                     onClick={() => setShowSeedModal(true)}
                     className="w-full py-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 font-black hover:bg-indigo-500 hover:text-white transition-all duration-300 uppercase tracking-widest text-[9px]"
                   >
                     Inicializar DB
                   </button>
                 </div>
               )}
                <p className="text-[9px] text-slate-500 mt-4 text-center font-bold leading-relaxed opacity-60">Limpia tickets y transacciones diarias únicamente.</p>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
             </div>
          </div>
        </aside>

        {/* Main Administrative Workspace */}
        <main className="xl:col-span-10 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-[750px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {activeTab === 'users' && <UserManagementView users={users} onAdd={onAddUser} onUpdate={onUpdateUser} onDelete={onDeleteUser} stations={stations} currentUserRole={userRole} />}
            {activeTab === 'services' && <ServiceManagementView services={services} onAdd={onAddService} onUpdate={onUpdateService} onDelete={onDeleteService} />}
            {activeTab === 'stations' && <StationManagementView stations={stations} services={services} onAdd={onAddStation} onUpdate={onUpdateStation} onDelete={onDeleteStation} />}
            {activeTab === 'printers' && <PrinterManagementView printers={printers} onAdd={onAddPrinter} onUpdate={onUpdatePrinter} onDelete={onDeletePrinter} />}
            {activeTab === 'analytics' && (
              <div className="p-4 lg:p-8">
                 <DashboardView 
                    tickets={state.tickets} 
                    services={state.services} 
                    stations={state.stations} 
                    onToggleService={onToggleService}
                 />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const StaffController: React.FC<{ 
  user: User, 
  tickets: Ticket[], 
  services: Service[], 
  stations: Station[],
  isServiceActive: (service: Service) => boolean,
  updateTicketStatus: (t: string, s: TicketStatus, st: string) => void 
}> = ({ user, tickets, services, stations, isServiceActive, updateTicketStatus }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
  const defaultStationId = isAdmin 
    ? (stations.find(s => s.active)?.id || null) 
    : (user.assignedStationId || null);
    
  const [activeStationId, setActiveStationId] = useState<string | null>(() => defaultStationId);

  useEffect(() => {
    if (user.assignedStationId && activeStationId !== user.assignedStationId && !isAdmin) {
      setActiveStationId(user.assignedStationId);
    }
  }, [user.assignedStationId, isAdmin]);

  const activeStation = useMemo(() => 
    stations.find(s => s.id === activeStationId),
  [stations, activeStationId]);

  const handleSelectStation = useCallback((id: string) => {
    if (isAdmin) {
      setActiveStationId(id);
    }
  }, [isAdmin]);

  if (!activeStationId || !activeStation) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 max-w-lg text-center mx-auto space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-5xl grayscale opacity-50">🔒</div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
        <p className="text-slate-500 font-medium leading-relaxed italic">Su perfil no cuenta con una estación de trabajo activa vinculada. Contacte con la administración de GESFIL para su asignación.</p>
      </div>
    );
  }

  return (
    <StaffView 
      station={activeStation} 
      allStations={isAdmin ? stations.filter(s => s.active) : stations.filter(s => s.id === user.assignedStationId && s.active)}
      tickets={tickets} 
      services={services} 
      userRole={user.role}
      isServiceActive={isServiceActive}
      onStatusUpdate={updateTicketStatus} 
      onSelectStation={isAdmin ? handleSelectStation : undefined}
    />
  );
};

const App: React.FC = () => {
  const { 
    state, addTicket, updateTicketStatus, resetSystem, login, logout, 
    addUser, updateUser, deleteUser,
    addService, updateService, deleteService,
    addStation, updateStation, deleteStation,
    addPrinter, updatePrinter, deletePrinter,
    isServiceActive, seedDatabase
  } = useQmsStore();

  const onToggleService = useCallback((id: string, active: boolean) => updateService(id, { active }), [updateService]);

  if (!state.currentUser) {
    return <LoginViewComponent onLogin={login} onSeed={seedDatabase} isInitialized={state.users.length > 0} />;
  }

  const role = state.currentUser.role;
  const user = state.currentUser;

  return (
    <Router>
      <div className="min-h-screen pb-32 bg-[#f8fafc]">
        <Routes>
          <Route path="/" element={
            [UserRole.TOTEM, UserRole.ADMIN, UserRole.SUPERADMIN].includes(role) 
              ? <TotemView services={state.services.filter(s => isServiceActive(s))} nextSequence={state.nextSequence} onIssueTicket={addTicket} printers={state.printers} /> 
              : role === UserRole.DISPLAY
                ? <Navigate to="/display" />
                : role === UserRole.STAFF
                  ? <Navigate to="/staff" />
                  : <div className="p-10 text-center text-slate-500">Rol no reconocido. Contacte al administrador.</div>
          } />
          
          <Route path="/staff" element={
            [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERADMIN].includes(role) ? (
              <div className="py-12 px-6">
                <StaffController 
                  user={user}
                  tickets={state.tickets}
                  services={state.services}
                  stations={state.stations}
                  isServiceActive={isServiceActive}
                  updateTicketStatus={updateTicketStatus}
                />
              </div>
            ) : role === UserRole.DISPLAY
              ? <Navigate to="/display" />
              : [UserRole.TOTEM, UserRole.ADMIN, UserRole.SUPERADMIN].includes(role)
                ? <Navigate to="/" />
                : <div className="p-10 text-center text-slate-500">Rol no reconocido. Contacte al administrador.</div>
          } />
          
          <Route path="/display" element={
            [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF, UserRole.TOTEM, UserRole.DISPLAY].includes(role) 
              ? <PublicDisplayView tickets={state.tickets} stations={state.stations} services={state.services} />
              : <Navigate to="/" />
          } />
          
          <Route path="/admin" element={
            [UserRole.ADMIN, UserRole.SUPERADMIN].includes(role) ? (
              <div className="space-y-4">
                <AdminPanel 
                  state={state}
                  reset={resetSystem} 
                  seed={seedDatabase}
                  userRole={role} 
                  users={state.users}
                  onAddUser={addUser}
                  onUpdateUser={updateUser}
                  onDeleteUser={deleteUser}
                  services={state.services}
                  onAddService={addService}
                  onUpdateService={updateService}
                  onDeleteService={deleteService}
                  stations={state.stations}
                  onAddStation={addStation}
                  onUpdateStation={updateStation}
                  onDeleteStation={deleteStation}
                  printers={state.printers}
                  onAddPrinter={addPrinter}
                  onUpdatePrinter={updatePrinter}
                  onDeletePrinter={deletePrinter}
                  onToggleService={onToggleService}
                />
              </div>
            ) : <Navigate to="/" />
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Nav role={role} logout={logout} currentUser={state.currentUser} />
      </div>
    </Router>
  );
};

export default App;
