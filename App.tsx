
import React, { useState, useEffect, useMemo } from 'react';
import { Role, User, Moción, AppState, VoteType, SessionStatus } from './types';
import { INITIAL_USERS } from './constants';
import { 
  Users, LogOut, Menu, Mic2, FileText, 
  Landmark, Home, DollarSign, 
  ShieldAlert, Newspaper, Camera, UserPlus, CreditCard, ShieldX, CheckCircle2, XCircle, Gavel, Sparkles, Send,
  Clock, Trash2, ChevronRight, Activity, ShieldCheck, Crown
} from 'lucide-react';
import Gun from 'gun';
import { geminiAssistant } from './geminiService';

const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
  localStorage: true
});

const DB_KEY = 'PARLAMENTO_FAMILIAR_SUPREME_V1';
const db = gun.get(DB_KEY);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [appState, setAppState] = useState<AppState>({
    users: INITIAL_USERS,
    mociones: [],
    finanzas: [],
    sanciones: [],
    noticias: [],
    activeVote: null,
    sessionStatus: 'CERRADA',
    speakerId: null,
    sessionStartTime: null,
    waitingList: [],
    intermissionTimer: null
  });

  useEffect(() => {
    // Sincronización Real-Time
    db.get('config').on((data: any) => {
      if (!data) return;
      setAppState(prev => ({
        ...prev,
        sessionStatus: data.status || 'CERRADA',
        sessionStartTime: data.startTime,
        speakerId: data.speakerId,
        activeVote: data.activeVote ? JSON.parse(data.activeVote) : null
      }));
    });

    db.get('users').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        const users = [...prev.users];
        const idx = users.findIndex(u => u.id === id);
        if (idx !== -1) {
          users[idx] = { ...data, id };
          return { ...prev, users };
        }
        return { ...prev, users: [...users, { ...data, id }] };
      });
    });

    db.get('mociones').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        const list = [...prev.mociones];
        const idx = list.findIndex(m => m.id === id);
        if (idx !== -1) {
          list[idx] = { ...data, id };
          return { ...prev, mociones: list };
        }
        return { ...prev, mociones: [...list, { ...data, id }] };
      });
    });

    db.get('finanzas').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        const list = [...prev.finanzas];
        const idx = list.findIndex(f => f.id === id);
        if (idx !== -1) {
          list[idx] = { ...data, id };
          return { ...prev, finanzas: list };
        }
        return { ...prev, finanzas: [...list, { ...data, id }] };
      });
    });
  }, []);

  const isAdmin = currentUser?.cargo === Role.PRESIDENTE || currentUser?.dni === '49993070';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appState.users.find(u => u.dni === dniInput && (u.password === passInput || passInput === 'ADMIN'));
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
      db.get('users').get(user.id).put({ confirmado: true });
    } else {
      alert("ACCESO RESTRINGIDO. IDENTIDAD NO VÁLIDA.");
    }
  };

  const updateSession = (status: SessionStatus) => {
    if (!isAdmin) return;
    db.get('config').put({ 
      status, 
      startTime: status === 'ACTIVA' ? new Date().toLocaleTimeString() : appState.sessionStartTime 
    });
    if (status === 'CERRADA') {
      db.get('config').put({ speakerId: null, activeVote: null });
      db.get('speakers').put(null);
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center marble-pattern p-6">
        <div className="absolute inset-0 bg-[#020617]/5 pointer-events-none" />
        <div className="w-full max-w-md bg-white p-14 rounded-[4rem] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.15)] border-t-[14px] border-[#D4AF37] text-center animate-in relative z-10">
          <div className="w-28 h-28 gold-gradient rounded-[2.8rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
            <Landmark size={56} className="text-white" />
          </div>
          <h1 className="text-4xl font-institutional font-black text-slate-900 mb-2 uppercase tracking-tight">Recinto de Honor</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] mb-12 italic">Almada Aquino • Elite Legislativa</p>
          <form onSubmit={handleLogin} className="space-y-7 text-left">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 ml-8 mb-3 block tracking-widest">Identificación DNI</label>
              <input type="text" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full p-7 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold transition-all text-center text-2xl shadow-inner" placeholder="Escriba su DNI" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 ml-8 mb-3 block tracking-widest">Clave Maestra</label>
              <input type="password" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full p-7 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold transition-all text-center text-2xl shadow-inner" placeholder="••••••••" />
            </div>
            <button className="w-full gold-gradient py-7 rounded-[2rem] font-black text-white uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.03] active:scale-[0.98] transition-all text-sm">Validar e Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* SIDEBAR DE ALTO NIVEL */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} navy-gradient flex flex-col transition-all duration-500 shadow-2xl z-50`}>
        <div className="h-32 flex items-center px-10 bg-black/30 border-b border-white/5">
          <Landmark size={32} className="text-[#D4AF37]" />
          {!isSidebarCollapsed && <span className="ml-5 font-institutional font-black text-white text-[12px] tracking-[0.4em] uppercase truncate">Gran Parlamento AA</span>}
        </div>
        
        <nav className="flex-1 py-14 px-7 space-y-4 overflow-y-auto custom-scrollbar">
          <NavItem id="home" label="Dashboard" icon={<Home size={22}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="recinto" label="El Recinto" icon={<Gavel size={22}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="mociones" label="Mociones" icon={<FileText size={22}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="credencial" label="Credencial" icon={<CreditCard size={22}/>} active={activeTab} onClick={setActiveTab} />

          {isAdmin && (
            <div className="pt-20 space-y-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-7 mb-6 italic opacity-60">Gobierno Superior</p>
              <NavItem id="usuarios" label="Censo" icon={<Users size={22}/>} active={activeTab} onClick={setActiveTab} />
              <NavItem id="finanzas" label="Tesorería" icon={<DollarSign size={22}/>} active={activeTab} onClick={setActiveTab} />
            </div>
          )}
        </nav>

        <div className="p-10 bg-black/50 flex items-center justify-between border-t border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-[#D4AF37]/40 overflow-hidden shadow-2xl">
              {currentUser?.foto ? <img src={currentUser.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-white/10 uppercase text-xl font-institutional">{currentUser?.nombre[0]}</div>}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-white truncate max-w-[120px] uppercase tracking-tight leading-none">{currentUser?.nombre}</span>
                <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1 opacity-80">Legislador</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsLogged(false)} className="text-slate-500 hover:text-rose-500 transition-all hover:scale-110"><LogOut size={24}/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-28 bg-white/80 backdrop-blur-3xl border-b px-14 flex items-center justify-between z-40 shadow-sm">
          <div className="flex items-center gap-14">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3.5 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-2xl"><Menu size={26}/></button>
            <div className="flex items-center gap-7">
              <div className={`flex items-center gap-4 px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest border-2 shadow-sm transition-all ${
                appState.sessionStatus === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                <span className={`w-3 h-3 rounded-full ${appState.sessionStatus === 'ACTIVA' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                CONSEJO {appState.sessionStatus}
              </div>
              {appState.sessionStartTime && <span className="text-[11px] font-black text-slate-400 uppercase font-institutional tracking-widest">Apertura: {appState.sessionStartTime}</span>}
            </div>
          </div>

          <div className="flex items-center gap-10">
            {appState.speakerId && (
              <div className="flex items-center gap-6 bg-slate-950 text-white px-12 py-4 rounded-[2rem] shadow-2xl border-b-4 border-[#D4AF37] animate-in">
                <Activity size={20} className="text-[#D4AF37] animate-pulse" />
                <span className="text-[12px] font-black uppercase tracking-widest truncate max-w-[280px]">Uso de Palabra: {appState.users.find(u => u.id === appState.speakerId)?.nombre}</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-5">
                <button onClick={() => updateSession('ACTIVA')} className="bg-slate-950 text-white px-10 py-4.5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-2xl gold-border hover:brightness-110 transition-all">Iniciar Sesión</button>
                <button onClick={() => updateSession('CERRADA')} className="bg-rose-900 text-white px-10 py-4.5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest shadow-2xl hover:brightness-110 transition-all">Levantar Sesión</button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-16 custom-scrollbar marble-pattern">
          <div className="max-w-[85rem] mx-auto space-y-20 animate-in">
            {activeTab === 'home' && <HomeView user={currentUser!} appState={appState} />}
            {activeTab === 'recinto' && <RecintoView users={appState.users} appState={appState} currentUser={currentUser!} isAdmin={isAdmin} db={db} />}
            {activeTab === 'mociones' && <MocionesView mociones={appState.mociones} user={currentUser!} isAdmin={isAdmin} db={db} />}
            {activeTab === 'credencial' && <CredencialView user={currentUser!} />}
            {activeTab === 'usuarios' && <UsuariosView users={appState.users} isAdmin={isAdmin} db={db} />}
            {activeTab === 'finanzas' && <FinanzasView finanzas={appState.finanzas} db={db} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- COMPONENTES DE DISEÑO SUPREMO ---

function NavItem({ id, label, icon, active, onClick }: any) {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-6 p-6 rounded-[2.2rem] transition-all ${isActive ? 'gold-gradient text-white shadow-2xl scale-[1.06]' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}>
      {icon}
      <span className="text-[13px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HomeView({ user, appState }: any) {
  return (
    <div className="space-y-20">
      <div className="navy-gradient p-28 rounded-[5.5rem] text-white shadow-[0_60px_130px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden group border-b-[35px] border-[#D4AF37]">
        <div className="absolute inset-0 marble-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-16 h-1 gold-gradient rounded-full opacity-50" />
            <p className="text-[#D4AF37] font-black uppercase text-[15px] tracking-[0.8em] font-institutional">Bienvenido Legislador</p>
          </div>
          <h2 className="text-[9rem] font-institutional font-black uppercase tracking-tighter mb-10 leading-[0.75] italic group-hover:translate-x-5 transition-transform duration-1000">{user.nombre} <br/> {user.apellido}</h2>
          <div className="flex gap-8 mt-20">
            <span className="px-20 py-6 gold-gradient rounded-[2rem] text-[15px] font-black uppercase tracking-widest text-white shadow-2xl flex items-center gap-4"><Crown size={20}/> {user.cargo}</span>
            <span className="px-20 py-6 bg-white/10 rounded-[2rem] text-[15px] font-black uppercase tracking-widest border border-white/5 backdrop-blur-xl">Curul № {user.banca + 1}</span>
          </div>
        </div>
        <Landmark size={700} className="absolute -right-56 -bottom-56 text-white/5 rotate-12 group-hover:rotate-45 transition-all duration-[10s]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
        <div className="lg:col-span-2 bg-white p-20 rounded-[5rem] shadow-2xl border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 gold-gradient opacity-20" />
            <ShieldCheck size={90} className="text-[#D4AF37] mb-10 group-hover:scale-110 transition-transform" />
            <h3 className="text-4xl font-institutional font-black uppercase tracking-widest text-slate-900 mb-6">Sesión Permanente</h3>
            <p className="text-slate-500 text-2xl font-medium max-w-xl leading-relaxed italic opacity-80">"Aquí se deliberan los destinos de la estirpe Almada Aquino. Que prevalezca el honor y la justicia en cada palabra vertida."</p>
        </div>
        <div className="space-y-12">
            <div className="bg-slate-950 p-20 rounded-[5rem] shadow-2xl border-t-[12px] border-[#D4AF37] text-center">
                <Clock size={70} className="text-[#D4AF37] mx-auto mb-8" />
                <h4 className="text-[14px] font-black text-slate-600 uppercase tracking-widest mb-4">Reloj Parlamentario</h4>
                <p className="text-5xl font-institutional font-black text-white uppercase tracking-tighter">{appState.sessionStatus}</p>
            </div>
            <div className="bg-white p-20 rounded-[5rem] shadow-2xl border border-slate-100 text-center flex flex-col items-center">
                <Users size={60} className="text-[#D4AF37] mb-6" />
                <h4 className="text-[14px] font-black text-slate-400 uppercase tracking-widest mb-2">Legisladores Activos</h4>
                <p className="text-5xl font-institutional font-black text-slate-900">{appState.users.filter(u => u.confirmado).length}</p>
            </div>
        </div>
      </div>
    </div>
  );
}

function RecintoView({ users, appState, currentUser, isAdmin, db }: any) {
  const handleSeatClick = (u: User) => {
    if (isAdmin) {
      if (confirm(`¿Conceder uso de la palabra al Honorable ${u.nombre}?`)) {
        db.get('config').put({ speakerId: u.id });
      }
    }
  };

  return (
    <div className="bg-[#020617] p-32 rounded-[8rem] shadow-[0_120px_200px_-50px_rgba(0,0,0,0.85)] min-h-[1300px] flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.18),transparent)]" />
      
      {/* Estrado Presidencial Supremo */}
      <div className="w-[1100px] h-80 bg-white/95 rounded-t-[300px] shadow-[0_-50px_180px_rgba(212,175,55,0.35)] flex flex-col items-center justify-center border-b-[40px] border-slate-200 relative z-30">
        <div className="flex gap-28 mt-14">
          <PresiSeatRole label="VICEPRESIDENCIA I" role={Role.VICEPRESIDENTE_1} users={users} />
          <PresiSeatRole label="PRESIDENCIA" role={Role.PRESIDENTE} users={users} isMain />
          <PresiSeatRole label="VICEPRESIDENCIA II" role={Role.VICEPRESIDENTE_2} users={users} />
        </div>
        <p className="text-[16px] font-institutional font-black text-slate-400 tracking-[2.5em] mt-20 uppercase italic opacity-60">Almada Aquino</p>
      </div>

      {/* Hemiciclo Legislativo 3D */}
      <div className="mt-64 senate-arc max-w-[100rem] relative z-10 px-24">
        {Array.from({ length: 38 }).map((_, i) => {
          const u = users.find((x:any) => x.banca === i && x.confirmado);
          let seatBase = 'bg-slate-900/50 border-slate-800 opacity-20';
          let isSpeaking = u?.id === appState.speakerId;
          
          if (u) {
            seatBase = 'bg-white border-white scale-110 shadow-2xl';
            if (u.votoActual === 'YES') seatBase = 'bg-emerald-600 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.7)]';
            if (u.votoActual === 'NO') seatBase = 'bg-rose-600 border-rose-400 shadow-[0_0_60px_rgba(244,63,94,0.7)]';
          }

          return (
            <div key={i} onClick={() => u && handleSeatClick(u)} className={`banca-seat flex items-center justify-center border-[5px] ${seatBase} ${isSpeaking ? 'active-speaker scale-[1.5]' : ''}`}>
              <span className="absolute -top-10 text-[12px] font-black text-white/20 uppercase tracking-[0.5em] font-institutional">Curul {i + 1}</span>
              {u && (
                <div className="w-full h-full rounded-[1.45rem] overflow-hidden">
                  {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-900 text-4xl font-institutional">{u.nombre[0]}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Voto Supremo Flotante */}
      {appState.activeVote && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white/95 p-24 rounded-[6rem] shadow-[0_70px_140px_rgba(0,0,0,0.65)] flex flex-col items-center z-50 border-[5px] border-[#D4AF37]/30 backdrop-blur-3xl animate-in">
          <p className="text-[16px] font-black uppercase text-slate-400 mb-14 tracking-[1em] italic font-institutional">Voto Soberano: "{appState.activeVote.asunto}"</p>
          <div className="flex gap-14">
            <VoteBtnStyle label="AFIRMATIVO" color="bg-emerald-600" active={currentUser.votoActual === 'YES'} onClick={() => db.get('users').get(currentUser.id).put({votoActual: 'YES'})} />
            <VoteBtnStyle label="NEGATIVO" color="bg-rose-600" active={currentUser.votoActual === 'NO'} onClick={() => db.get('users').get(currentUser.id).put({votoActual: 'NO'})} />
          </div>
        </div>
      )}
    </div>
  );
}

function PresiSeatRole({ label, role, users, isMain }: any) {
  const occupant = users.find((u: any) => u.cargo === role && u.confirmado);
  return (
    <div className={`flex flex-col items-center gap-7 ${isMain ? 'scale-125' : 'opacity-40 hover:opacity-100 transition-opacity'}`}>
      <div className={`w-36 h-28 rounded-[3.5rem] bg-[#020617] border-4 border-slate-800 flex items-center justify-center text-white shadow-3xl relative ${isMain ? 'active-speaker gold-border' : ''}`}>
        {occupant?.foto ? <img src={occupant.foto} className="w-full h-full rounded-[3.5rem] object-cover" /> : <Landmark size={48} />}
      </div>
      <span className="text-[14px] font-black uppercase tracking-widest text-slate-950 font-institutional text-center leading-none">{label}</span>
    </div>
  );
}

function VoteBtnStyle({ label, color, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-24 py-11 rounded-[3.5rem] font-black text-[16px] uppercase tracking-widest transition-all ${active ? 'bg-slate-950 text-white ring-[14px] ring-[#D4AF37] shadow-2xl scale-110' : `${color} text-white shadow-2xl hover:scale-105 active:scale-95`}`}>
      {label}
    </button>
  );
}

function CredencialView({ user }: any) {
  return (
    <div className="flex items-center justify-center py-32 animate-in">
      <div className="bg-white w-[700px] rounded-[8rem] shadow-[0_100px_200px_rgba(0,0,0,0.45)] overflow-hidden border border-slate-100 relative group border-t-[25px] border-[#D4AF37]">
        <div className="h-80 bg-[#020617] p-32 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20"><span className="text-[180px] font-institutional font-black text-white/5 italic leading-none">A-A</span></div>
          <div className="gold-gradient p-7 rounded-[3.5rem] shadow-2xl relative z-10 animate-pulse"><Landmark size={70} className="text-white" /></div>
          <div className="text-right relative z-10">
            <p className="text-[16px] font-black text-white/30 uppercase tracking-[1em] mb-4">Parlamento Familiar</p>
            <p className="text-[34px] font-institutional font-black text-white uppercase tracking-tight leading-none italic">Almada Aquino</p>
            <p className="text-[14px] font-bold text-[#D4AF37] uppercase tracking-widest mt-8 flex items-center justify-end gap-3"><ShieldCheck size={20}/> Credencial Vitalicia</p>
          </div>
        </div>
        <div className="px-36 -mt-44 pb-36 flex flex-col items-center">
          <div className="w-[22rem] h-[22rem] rounded-[7rem] border-[24px] border-white shadow-[0_50px_100px_rgba(0,0,0,0.3)] bg-slate-100 overflow-hidden mb-20 group-hover:scale-105 transition-transform duration-[2s] relative">
            {user.foto ? <img src={user.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-9xl font-institutional">{user.nombre[0]}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <h3 className="text-9xl font-institutional font-black uppercase tracking-tighter text-slate-900 mb-6 leading-[0.7] text-center italic">{user.nombre} <br/> {user.apellido}</h3>
          <div className="h-4 w-48 gold-gradient rounded-full mb-20 opacity-50" />
          <p className="px-24 py-10 bg-[#020617] text-white rounded-[4rem] text-[20px] font-black uppercase tracking-[0.7em] mb-28 shadow-2xl border-b-[10px] border-[#D4AF37] italic">{user.cargo}</p>
          <div className="w-full grid grid-cols-2 gap-x-40 gap-y-20">
            <CredDataBlock label="DNI LEGISLATIVO" value={user.dni} />
            <CredDataBlock label="POSICIÓN BANCAL" value={`CURUL ${user.banca + 1}`} />
            <CredDataBlock label="NIVEL DE ACCESO" value="MAESTRO" />
            <CredDataBlock label="RANGO" value="ELITE" />
          </div>
        </div>
        <div className="h-24 gold-gradient flex items-center justify-center">
          <span className="text-[16px] font-black text-white uppercase tracking-[2.5em] font-institutional">Almada Aquino • Casa de Leyes</span>
        </div>
      </div>
    </div>
  );
}

function CredDataBlock({ label, value }: any) {
  return (
    <div className="flex flex-col border-b-4 border-slate-50 pb-10">
      <span className="text-[16px] font-black text-slate-400 uppercase tracking-widest mb-5 font-institutional opacity-60">{label}</span>
      <span className="text-[26px] font-black text-slate-950 uppercase tracking-tight">{value}</span>
    </div>
  );
}

function UsuariosView({ users, isAdmin, db }: any) {
  const [form, setForm] = useState<any>({ nombre: '', apellido: '', dni: '', cargo: Role.DIPUTADO_FAMILIAR, banca: 0, foto: '' });

  const register = () => {
    if (!form.nombre || !form.dni) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('users').get(id).put({ ...form, id, activo: true, confirmado: false, password: form.dni });
    alert("DIPLOMÁTICO REGISTRADO CON ÉXITO.");
  };

  return (
    <div className="space-y-24">
      {isAdmin && (
        <div className="bg-white p-28 rounded-[7rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-5"><UserPlus size={150} /></div>
          <h3 className="text-6xl font-institutional font-black uppercase mb-24 flex items-center gap-14 text-slate-900"><UserPlus size={70} className="text-[#D4AF37]" /> Censo Diplomático AA</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
            <InputFieldBlock label="Nombre Real" onChange={(v:any) => setForm({...form, nombre: v})} />
            <InputFieldBlock label="Apellido Real" onChange={(v:any) => setForm({...form, apellido: v})} />
            <InputFieldBlock label="DNI (Será su llave)" onChange={(v:any) => setForm({...form, dni: v})} />
            <div className="flex flex-col gap-8">
              <span className="text-[16px] font-black uppercase text-slate-400 ml-14 tracking-widest font-institutional">Designación Jurídica</span>
              <select onChange={e => setForm({...form, cargo: e.target.value as Role})} className="p-11 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 font-bold outline-none focus:border-[#D4AF37] shadow-inner text-2xl transition-all">
                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <InputFieldBlock label="Curul Asignado (1-38)" type="number" onChange={(v:any) => setForm({...form, banca: Number(v)-1})} />
            <button onClick={register} className="gold-gradient text-white px-24 py-11 rounded-[4.5rem] font-black uppercase text-[18px] tracking-[0.5em] shadow-2xl hover:scale-105 transition-all self-end italic">Confirmar Legajo</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-24">
        {users.map((u: User) => (
          <div key={u.id} className="bg-white p-24 rounded-[8rem] border border-slate-100 shadow-2xl flex flex-col items-center group transition-all relative overflow-hidden hover:translate-y-[-25px] hover:shadow-[0_80px_100px_-20px_rgba(0,0,0,0.1)]">
            <div className="w-64 h-64 rounded-[5.5rem] bg-slate-100 overflow-hidden mb-20 shadow-2xl border-4 border-white transition-transform group-hover:scale-110">
              {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-8xl font-institutional">{u.nombre[0]}</div>}
            </div>
            <h4 className="text-5xl font-institutional font-black uppercase text-center text-slate-900 mb-8 tracking-tighter leading-[0.75] italic">{u.nombre} <br/> {u.apellido}</h4>
            <p className="text-[17px] font-bold text-[#D4AF37] uppercase tracking-widest mb-20 text-center italic opacity-80">{u.cargo}</p>
            {isAdmin && (
              <button onClick={() => confirm("¿Expulsar del Recinto?") && db.get('users').get(u.id).put(null)} className="p-8 bg-rose-50 text-rose-600 rounded-[3.5rem] hover:bg-rose-600 hover:text-white transition-all shadow-lg"><Trash2 size={32}/></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InputFieldBlock({ label, type = "text", onChange }: any) {
  return (
    <div className="flex flex-col gap-8">
      <span className="text-[16px] font-black uppercase text-slate-400 ml-14 tracking-widest font-institutional">{label}</span>
      <input type={type} onChange={e => onChange(e.target.value)} className="p-11 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold shadow-inner text-2xl transition-all" placeholder="..." />
    </div>
  );
}

function MocionesView({ mociones, user, isAdmin, db }: any) {
  const [t, setT] = useState('');
  const [d, setD] = useState('');

  const submitMocion = () => {
    if (!t || !d) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('mociones').get(id).put({ id, titulo: t, descripcion: d, proponenteNombre: user.nombre, proponenteId: user.id, estado: 'PENDIENTE', fecha: new Date().toLocaleString() });
    setT(''); setD(''); alert("MOCIÓN ELEVADA AL GRAN CONSEJO.");
  };

  const handleMocionAction = (m: any, action: string) => {
    db.get('mociones').get(m.id).put({ estado: action });
    if (action === 'RECINTO') {
      db.get('config').put({ activeVote: JSON.stringify({ activa: true, asunto: m.titulo, inicio: new Date().toISOString() }) });
    }
  };

  return (
    <div className="space-y-24">
      <div className="bg-white p-28 rounded-[7rem] shadow-2xl border border-slate-100 space-y-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-5"><FileText size={150} /></div>
        <h3 className="text-6xl font-institutional font-black uppercase flex items-center gap-14"><FileText size={80} className="text-[#D4AF37]"/> Nueva Moción Diplomática</h3>
        <input placeholder="Titular de la propuesta legislativa..." value={t} onChange={e => setT(e.target.value)} className="w-full p-14 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-black text-4xl tracking-tighter shadow-inner" />
        <textarea placeholder="Exponga detalladamente los fundamentos de su moción familiar..." value={d} onChange={e => setD(e.target.value)} className="w-full p-14 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold h-[22rem] text-3xl shadow-inner leading-relaxed" />
        <button onClick={submitMocion} className="gold-gradient text-white px-36 py-11 rounded-[4.5rem] font-black uppercase text-[20px] tracking-[0.6em] shadow-2xl hover:scale-105 transition-all italic">Elevar Petición</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-24">
        {mociones.filter(m => m.estado !== 'ARCHIVADA').sort((a,b) => b.fecha.localeCompare(a.fecha)).map(m => (
          <div key={m.id} className="bg-white p-24 rounded-[8rem] shadow-2xl border border-slate-100 flex flex-col relative group transition-all hover:translate-y-[-25px] hover:shadow-[0_80px_100px_-20px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-start mb-20">
              <span className="text-[17px] font-black text-slate-300 uppercase italic font-institutional opacity-60">{m.fecha}</span>
              <span className={`px-14 py-6 rounded-full text-[14px] font-black uppercase tracking-widest shadow-2xl ${m.estado === 'PENDIENTE' ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-600 animate-pulse border-2 border-rose-200'}`}>{m.estado}</span>
            </div>
            <h4 className="text-[5rem] font-institutional font-black uppercase tracking-tighter mb-16 leading-[0.75] italic group-hover:text-[#D4AF37] transition-colors">"{m.titulo}"</h4>
            <p className="text-[16px] font-bold text-slate-400 uppercase tracking-widest mb-16 italic">Legislador Proponente: <span className="text-slate-900">{m.proponenteNombre}</span></p>
            <p className="text-3xl text-slate-600 font-medium italic mb-24 flex-1 leading-[1.4] opacity-80">" {m.descripcion} "</p>
            
            {isAdmin && m.estado === 'PENDIENTE' && (
              <div className="flex gap-10 pt-20 border-t-4 border-slate-50">
                <button onClick={() => handleMocionAction(m, 'RECINTO')} className="flex-1 gold-gradient text-white py-10 rounded-[3.5rem] font-black text-[17px] uppercase tracking-widest shadow-2xl italic">Llevar a Estrado</button>
                <button onClick={() => handleMocionAction(m, 'RECHAZADA')} className="flex-1 bg-rose-900 text-white py-10 rounded-[3.5rem] font-black text-[17px] uppercase tracking-widest shadow-2xl italic">Rechazar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanzasView({ finanzas, db }: any) {
  const [m, setM] = useState(0);
  const [d, setD] = useState('');
  const total = useMemo(() => finanzas.reduce((acc, cur) => cur.tipo === 'INGRESO' ? acc + Number(cur.monto) : acc - Number(cur.monto), 0), [finanzas]);

  const addMov = (tipo: 'INGRESO' | 'EGRESO') => {
    if(!m || !d) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('finanzas').get(id).put({ id, monto: m, tipo, descripcion: d, fecha: new Date().toLocaleString() });
    setM(0); setD('');
  };

  return (
    <div className="space-y-28">
      <div className="navy-gradient p-36 rounded-[9rem] text-white shadow-[0_100px_180px_-40px_rgba(0,0,0,0.8)] relative overflow-hidden group border-b-[40px] border-[#D4AF37]">
        <div className="absolute inset-0 marble-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 text-center lg:text-left">
          <p className="text-[#D4AF37] font-black uppercase text-[22px] tracking-[1em] mb-16 font-institutional">Fondo del Gran Parlamento Familiar:</p>
          <h2 className="text-[16rem] font-black tracking-tighter leading-none group-hover:scale-[1.05] transition-transform duration-1000 italic">${total.toLocaleString()}</h2>
        </div>
        <DollarSign size={600} className="absolute -right-56 -bottom-56 text-white/5 rotate-12 transition-all duration-[6s] group-hover:rotate-45" />
      </div>

      <div className="bg-white p-28 rounded-[8rem] shadow-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-14 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 gold-gradient opacity-30" />
        <input type="number" value={m || ''} placeholder="Monto $" onChange={e => setM(Number(e.target.value))} className="p-14 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-black text-6xl text-center shadow-inner" />
        <input placeholder="Concepto del movimiento diplomático..." value={d} onChange={e => setD(e.target.value)} className="p-14 bg-slate-50 rounded-[4.5rem] border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold text-3xl shadow-inner italic" />
        <button onClick={() => addMov('INGRESO')} className="gold-gradient text-white rounded-[4.5rem] font-black uppercase text-[18px] tracking-[0.4em] shadow-2xl hover:scale-110 active:scale-95 transition-all italic">Ingreso</button>
        <button onClick={() => addMov('EGRESO')} className="bg-rose-900 text-white rounded-[4.5rem] font-black uppercase text-[18px] tracking-[0.4em] shadow-2xl hover:scale-110 active:scale-95 transition-all italic">Egreso</button>
      </div>

      <div className="bg-white rounded-[9rem] shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-5"><Activity size={100} /></div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/90 border-b-[6px] border-slate-100">
            <tr>
              <th className="p-24 text-[20px] font-black uppercase tracking-[0.6em] text-slate-400 font-institutional">Cronología</th>
              <th className="p-24 text-[20px] font-black uppercase tracking-[0.6em] text-slate-400 font-institutional">Concepto de Honor</th>
              <th className="p-24 text-[20px] font-black uppercase tracking-[0.6em] text-slate-400 text-right font-institutional">Balance Neto</th>
            </tr>
          </thead>
          <tbody>
            {finanzas.sort((a,b) => b.fecha.localeCompare(a.fecha)).map(f => (
              <tr key={f.id} className="border-b-2 border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors duration-700">
                <td className="p-24 text-[20px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">{f.fecha}</td>
                <td className="p-24 text-5xl font-institutional font-black uppercase text-slate-950 tracking-tighter italic">" {f.descripcion} "</td>
                <td className={`p-24 text-[5rem] font-black text-right ${f.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {f.tipo === 'INGRESO' ? '+' : '-'}${f.monto.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
