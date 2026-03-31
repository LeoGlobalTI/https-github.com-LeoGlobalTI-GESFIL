
import React, { useState } from 'react';
import { Service } from '@/types';
import ConfirmationModal from './ConfirmationModal';

interface ServiceManagementViewProps {
  services: Service[];
  onAdd: (data: Omit<Service, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Service>) => void;
  onDelete: (id: string) => void;
}

const ServiceManagementView: React.FC<ServiceManagementViewProps> = ({ services, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    prefix: '',
    color: '#3b82f6',
    description: '',
    active: true
  });

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        prefix: service.prefix,
        color: service.color,
        description: service.description,
        active: service.active
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', prefix: '', color: '#3b82f6', description: '', active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      onUpdate(editingService.id, formData);
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/30 gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Esquema de Servicios</h3>
          <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-[0.2em]">Definición de colas lógicas y segmentación operativa</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nueva Unidad Lógica
        </button>
      </div>

      <div className="p-10 flex-grow overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
          {services.map(service => {
            return (
              <div key={service.id} className="group relative bg-white rounded-[3rem] border border-slate-100 overflow-hidden hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 border-t-0">
                <div className="h-4 w-full" style={{ backgroundColor: service.color }}></div>
                <div className="p-10">
                  <div className="flex justify-between items-start mb-8">
                      <div className="w-18 h-18 rounded-[1.75rem] flex items-center justify-center font-black text-white text-3xl shadow-2xl ring-4 ring-white" style={{ backgroundColor: service.color }}>
                        {service.prefix}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          service.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {service.active ? 'Routing Activo' : 'Offline'}
                        </span>
                      </div>
                  </div>
                 
                 <h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{service.name}</h4>
                 
                 <div className="flex items-center gap-4 mb-6">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Configuración por Módulo</span>
                 </div>

                 <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10 line-clamp-2 h-10 italic">
                   {service.description || 'Sin descripción técnica disponible para esta unidad.'}
                 </p>
                 
                 <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                    <button onClick={() => handleOpenModal(service)} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-900 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                       Parámetros
                    </button>
                    <button onClick={() => { setServiceToDelete(service); setShowDeleteModal(true); }} className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Eliminar
                    </button>
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
          if (serviceToDelete) {
            onDelete(serviceToDelete.id);
            setServiceToDelete(null);
          }
        }}
        title="Eliminar Servicio"
        message={`¿Estás seguro de que deseas eliminar el servicio "${serviceToDelete?.name}"? Esta acción no se puede deshacer.`}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingService ? 'Ajustes de Servicio' : 'Nueva Unidad'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-full hover:bg-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identificador Comercial</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Routing Code</label>
                    <input 
                    type="text" required maxLength={4}
                    value={formData.prefix}
                    onChange={e => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-900 text-center uppercase focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity Color</label>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
                    <input 
                      type="color" required
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none"
                    />
                    <span className="font-mono text-[11px] font-black text-slate-500 uppercase">{formData.color}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción de Operación</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-600 resize-none h-24 focus:ring-2 focus:ring-indigo-600/20"
                  placeholder="Defina el alcance de esta unidad de servicio..."
                />
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Cerrar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagementView;
