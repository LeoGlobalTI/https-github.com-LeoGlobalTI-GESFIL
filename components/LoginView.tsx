import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (username: string, password?: string) => boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="max-w-[440px] w-full animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">GES<span className="text-blue-600">FIL</span></h1>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portal Corporativo</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestión Hospitalaria de Alto Rendimiento</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-pulse">
              Credenciales no válidas
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Identificador de Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Clave de Acceso</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all font-medium"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all text-lg"
          >
            Iniciar Sesión
          </button>

          <div className="pt-4 flex items-center justify-between text-xs text-slate-400 font-bold border-t border-slate-100">
            <span>v4.0.2 Stable</span>
            <span className="text-blue-600 cursor-pointer hover:underline">Recuperar Acceso</span>
          </div>
        </form>

        <footer className="mt-12 text-center">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Powered by GESFIL Infrastructure &copy; 2024</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginView;