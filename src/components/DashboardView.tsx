
import React, { useMemo, useState, useEffect } from 'react';
import { Ticket, Service, Station, TicketStatus } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts';
import TicketTraceabilityModal from './TicketTraceabilityModal';
import { supabase } from '@/lib/supabase';

interface DashboardViewProps {
  tickets: Ticket[];
  services: Service[];
  stations: Station[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ tickets, services, stations }) => {
  const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(null);
  
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>(services.map(s => s.id));
  const [historicalTickets, setHistoricalTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedServices(services.map(s => s.id));
  }, [services]);

  const fetchHistoricalTickets = async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
        
      if (error) throw error;
      
      if (data) {
        const mapped = data.map(t => ({
          id: t.id,
          code: t.code,
          serviceId: t.service_id,
          status: (t.status || '').toUpperCase() as TicketStatus,
          createdAt: new Date(t.created_at).getTime(),
          calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
          startedAt: t.started_at ? new Date(t.started_at).getTime() : undefined,
          endedAt: t.ended_at ? new Date(t.ended_at).getTime() : undefined,
          stationId: t.station_id,
          metadata: {
            recalledCount: t.recalled_count || 0,
            priority: t.priority || false
          }
        }));
        setHistoricalTickets(mapped);
      }
    } catch (err) {
      console.error("Error fetching historical tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange === 'today') {
      setHistoricalTickets(tickets);
      return;
    }
    
    let start = new Date();
    let end = new Date();
    
    if (dateRange === 'week') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'month') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) return;
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    }
    
    fetchHistoricalTickets(start, end);
  }, [dateRange, customStartDate, customEndDate, tickets]);

  const filteredTickets = useMemo(() => {
    return historicalTickets.filter(t => selectedServices.includes(t.serviceId));
  }, [historicalTickets, selectedServices]);

  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const completed = filteredTickets.filter(t => t.status === TicketStatus.COMPLETED).length;
    const waiting = filteredTickets.filter(t => t.status === TicketStatus.WAITING).length;
    const cancelled = filteredTickets.filter(t => t.status === TicketStatus.CANCELLED).length;

    let totalWaitTime = 0;
    let waitCount = 0;
    let totalServiceTime = 0;
    let serviceCount = 0;

    const dataByService = services.filter(s => selectedServices.includes(s.id)).map(s => {
      const sTickets = filteredTickets.filter(t => t.serviceId === s.id);
      
      let sWaitTime = 0;
      let sWaitCount = 0;
      let sServiceTime = 0;
      let sServiceCount = 0;

      sTickets.forEach(t => {
        if (t.calledAt) {
          sWaitTime += (t.calledAt - t.createdAt);
          sWaitCount++;
          totalWaitTime += (t.calledAt - t.createdAt);
          waitCount++;
        }
        if (t.startedAt && t.endedAt) {
          sServiceTime += (t.endedAt - t.startedAt);
          sServiceCount++;
          totalServiceTime += (t.endedAt - t.startedAt);
          serviceCount++;
        }
      });

      return {
        name: s.name,
        value: sTickets.length,
        color: s.color || '#4f46e5',
        avgWait: sWaitCount > 0 ? Math.round(sWaitTime / sWaitCount / 60000) : 0,
        avgService: sServiceCount > 0 ? Math.round(sServiceTime / sServiceCount / 60000) : 0,
      };
    }).filter(item => item.value > 0 || services.some(s => s.name === item.name && s.active));

    const avgWaitTime = waitCount > 0 ? Math.round(totalWaitTime / waitCount / 60000) : 0;
    const avgServiceTime = serviceCount > 0 ? Math.round(totalServiceTime / serviceCount / 60000) : 0;

    const ticketsByDateMap: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString();
      ticketsByDateMap[dateStr] = (ticketsByDateMap[dateStr] || 0) + 1;
    });
    
    const trendData = Object.entries(ticketsByDateMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, count }));

    const statusData = [
      { name: 'Atendidos', value: completed, color: '#10b981' },
      { name: 'En Cola', value: waiting, color: '#f59e0b' },
      { name: 'Cancelados', value: cancelled, color: '#f43f5e' }
    ].filter(item => item.value > 0);

    const recent = [...filteredTickets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

    return { total, completed, waiting, cancelled, dataByService, avgWaitTime, avgServiceTime, trendData, statusData, recent };
  }, [filteredTickets, services, selectedServices]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">GESFIL Business Hub</h1>
          <p className="text-slate-500 font-medium">Infraestructura de Gestión en Tiempo Real</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rango de Fechas</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Últimos 7 Días' },
              { id: 'month', label: 'Últimos 30 Días' },
              { id: 'custom', label: 'Personalizado' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${dateRange === range.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-end gap-4 mt-4 animate-fade-in">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desde</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hasta</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por Servicios</label>
          <div className="flex flex-wrap gap-3">
            {services.map(s => (
              <label key={s.id} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer transition-all ${selectedServices.includes(s.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedServices.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedServices([...selectedServices, s.id]);
                    } else {
                      setSelectedServices(selectedServices.filter(id => id !== s.id));
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-sm font-bold">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
            {[
              { label: 'Total Turnos', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
              { label: 'Atendidos', value: stats.completed, color: 'text-emerald-500', bg: 'bg-white' },
              { label: 'En Cola', value: stats.waiting, color: 'text-amber-500', bg: 'bg-white' },
              { label: 'Cancelados', value: stats.cancelled, color: 'text-rose-500', bg: 'bg-white' },
              { label: 'T. Promedio Espera', value: `${stats.avgWaitTime}m`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'T. Promedio Atención', value: `${stats.avgServiceTime}m`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:-translate-y-1`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{k.label}</p>
                <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Tendencia de Turnos</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Distribución por Servicio</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dataByService}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={45}>
                        {stats.dataByService.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Tiempos Promedio por Servicio (Minutos)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dataByService}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Legend wrapperStyle={{fontSize: '12px', fontWeight: 600, paddingTop: '20px'}} />
                      <Bar dataKey="avgWait" name="Tiempo de Espera" fill="#f59e0b" radius={[8, 8, 8, 8]} barSize={30} />
                      <Bar dataKey="avgService" name="Tiempo de Atención" fill="#10b981" radius={[8, 8, 8, 8]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Estado de Turnos</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 600}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <h3 className="text-lg font-black mb-8 uppercase tracking-widest text-indigo-400">Trazabilidad Reciente</h3>
                <div className="space-y-4">
                  {stats.recent.length > 0 ? stats.recent.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all cursor-pointer" onClick={() => setInspectingTicket(t)}>
                      <div>
                          <p className="text-sm font-black text-white">{t.code}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${t.status === 'COMPLETED' ? 'bg-emerald-500' : t.status === 'CANCELLED' ? 'bg-rose-500' : t.status === 'WAITING' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-slate-500 italic text-sm">No hay transacciones en este periodo</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {inspectingTicket && (
        <TicketTraceabilityModal 
          ticket={inspectingTicket}
          service={services.find(s => s.id === inspectingTicket.serviceId)}
          station={stations.find(st => st.id === inspectingTicket.stationId)}
          onClose={() => setInspectingTicket(null)}
        />
      )}
    </div>
  );
};

export default DashboardView;
