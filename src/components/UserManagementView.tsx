
import React, { useState } from 'react';
import { User, UserRole, Station } from '@/types';
import ConfirmationModal from './ConfirmationModal';

interface UserManagementViewProps {
  users: User[];
  onAdd: (userData: Omit<User, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<User>) => void;
  onDelete: (id: string) => void;
  stations: Station[];
  currentUserRole: UserRole;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ users, onAdd, onUpdate, onDelete, stations, currentUserRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.STAFF,
    assignedStationId: ''
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        password: user.password || '',
        role: user.role,
        assignedStationId: user.assignedStationId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', username: '', password: '', role: UserRole.STAFF, assignedStationId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend: any = { ...formData };
    
    if (dataToSend.role !== UserRole.STAFF) {
      dataToSend.assignedStationId = undefined;
    }

    if (editingUser) {
      onUpdate(editingUser.id, dataToSend);
    } else {
      onAdd(dataToSend);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/30 gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Directorio de Identidades</h3>
          <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-[0.2em]">Gestión de privilegios y vinculación de terminales</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Registrar Operador
        </button>
      </div>

      <div className="p-10 flex-grow overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {users.map(user => {
            const station = stations.find(s => s.id === user.assignedStationId);
            return (
              <div key={user.id} className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-200 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                 
                 <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-2xl font-black text-white shadow-2xl ${
                      user.role === UserRole.SUPERADMIN ? 'bg-slate-900' :
                      user.role === UserRole.ADMIN ? 'bg-indigo-600' : 'bg-emerald-600'
                    } ring-4 ring-white`}>
                      {user.name[0]}
                    </div>
                    <div className="flex-grow min-w-0">
                       <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xl font-black text-slate-900 truncate pr-2">{user.name}</h4>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                            user.role === UserRole.SUPERADMIN ? 'bg-slate-900 text-white' :
                            user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {user.role}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl text-[9px] font-black bg-slate-100 text-slate-400 uppercase tracking-widest">
                            @{user.username}
                          </span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Terminal</span>
                       <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">
                         {user.role === UserRole.STAFF ? (station?.name || 'No Vinculado') : '---'}
                       </span>
                    </div>
                    <div className="flex gap-1">
                      {/* Only SUPERADMIN can edit/delete anyone. ADMIN can only edit/delete STAFF, TOTEM, DISPLAY */}
                      {(currentUserRole === UserRole.SUPERADMIN || (currentUserRole === UserRole.ADMIN && ![UserRole.SUPERADMIN, UserRole.ADMIN].includes(user.role))) && (
                        <>
                          <button onClick={() => handleOpenModal(user)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          if (userToDelete) {
            onDelete(userToDelete.id);
            setUserToDelete(null);
          }
        }}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${userToDelete?.name}"? Esta acción no se puede deshacer.`}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingUser ? 'Ajustes de Cuenta' : 'Registrar Operador'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-full hover:bg-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Usuario</label>
                  <input 
                    type="text" required
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clave</label>
                  <input 
                    type="password" required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nivel de Acceso</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 appearance-none"
                >
                  <option value={UserRole.STAFF}>STAFF (Atención)</option>
                  {currentUserRole === UserRole.SUPERADMIN && <option value={UserRole.ADMIN}>ADMIN (Gestión)</option>}
                  {currentUserRole === UserRole.SUPERADMIN && <option value={UserRole.SUPERADMIN}>SUPERADMIN (Master)</option>}
                  <option value={UserRole.TOTEM}>TOTEM (Emisor)</option>
                  <option value={UserRole.DISPLAY}>DISPLAY (Monitor)</option>
                </select>
              </div>

              {formData.role === UserRole.STAFF && (
                <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 text-center">Vinculación de Terminal</label>
                  <select 
                    value={formData.assignedStationId}
                    onChange={e => setFormData({...formData, assignedStationId: e.target.value})}
                    className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl outline-none font-black text-indigo-600 text-sm shadow-sm"
                  >
                    <option value="">Sin módulo asignado...</option>
                    {stations.filter(s => s.active).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.operatorName})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
