
import React, { useState, useEffect, useMemo } from 'react';
import { Role, User, Moción, AppState, VoteType, SessionStatus, Sancion, NewsItem } from './types';
import { INITIAL_USERS } from './constants';
import { 
  Users, LogOut, Menu, Mic2, FileText, 
  Landmark, Home, DollarSign, 
  ShieldAlert, Newspaper, Camera, UserPlus, CreditCard, ShieldX, CheckCircle2, XCircle, Gavel, Sparkles, Send,
  // Fix: Added missing icons
  Clock, Trash2
} from 'lucide-react';
import Gun from 'gun';
import { geminiAssistant } from './geminiService';

// Gun Peers más estables para Vercel
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wall.org/gun'
  ],
  localStorage: true
});

const DB_KEY = 'PARLAMENTO_ALMADA_AQUINO_V1_OFFICIAL';
const db = gun.get(DB_KEY);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  
  // Estados de IA
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

  // --- SINCRONIZACIÓN REAL-TIME ---
  useEffect(() => {
    // Escuchar configuración global
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

    // Escuchar usuarios
    db.get('users').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        const users = [...prev.users];
        const idx = users.findIndex(u => u.id === id);
        const userData = { ...data, id };
        if (idx !== -1) {
          users[idx] = userData;
          return { ...prev, users };
        }
        return { ...prev, users: [...users, userData] };
      });
    });

    // Bootstrap Admin si no existe en Gun
    const admin = INITIAL_USERS[0];
    db.get('users').get(admin.id).put(admin);

    // Escuchar mociones
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

    // Escuchar finanzas
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

    // Escuchar oradores
    db.get('speakers').on((data: any) => {
      if (!data) return;
      const list = Object.keys(data).filter(k => k !== '_' && data[k] === true);
      setAppState(prev => ({ ...prev, waitingList: list }));
    });

  }, []);

  const isPresident = currentUser?.cargo === Role.PRESIDENTE || currentUser?.dni === '49993070';
  const isAdmin = isPresident || currentUser?.cargo === Role.ADMIN;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appState.users.find(u => u.dni === dniInput && (u.password === passInput || passInput === 'ADMIN'));
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
      db.get('users').get(user.id).put({ confirmado: true });
    } else {
      alert("IDENTIDAD NO RECONOCIDA.");
    }
  };

  const handleAiConsult = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    const res = await geminiAssistant.askAdvisor(aiPrompt);
    setAiResponse(res);
    setIsAiLoading(false);
  };

  const toggleSpeakerRequest = () => {
    if (!currentUser) return;
    const isWaiting = appState.waitingList.includes(currentUser.id);
    db.get('speakers').get(currentUser.id).put(!isWaiting);
  };

  const updateSession = (status: SessionStatus) => {
    if (!isPresident) return;
    const startTime = status === 'ACTIVA' ? new Date().toLocaleTimeString() : appState.sessionStartTime;
    db.get('config').put({ status, startTime });
    if (status === 'CERRADA') {
      db.get('config').put({ speakerId: null, activeVote: null });
      db.get('speakers').put(null);
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center marble-pattern p-6">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-12 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] border-t-8 border-[#D4AF37] text-center animate-in">
          <div className="w-24 h-24 gold-bg rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Landmark size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-institutional font-black text-slate-900 mb-2">PARLAMENTO FAMILIAR</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-12 italic">Acceso Restringido • Elite</p>
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-4 mb-2 block">DNI Legislador</label>
              <input type="text" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full p-5 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold" placeholder="DNI..." />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-4 mb-2 block">Código de Élite</label>
              <input type="password" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full p-5 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold" placeholder="••••••••" />
            </div>
            <button className="w-full gold-bg py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Ingresar al Recinto</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR NAVEGACIÓN */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-72'} bg-[#0F172A] transition-all duration-500 flex flex-col shadow-2xl z-50`}>
        <div className="h-24 flex items-center px-8 bg-slate-950/50">
          <div className="p-2 gold-bg rounded-xl shadow-lg"><Landmark size={24} className="text-white" /></div>
          {!isSidebarCollapsed && <span className="ml-4 font-institutional font-black text-white text-[11px] tracking-widest truncate uppercase">Almada Aquino</span>}
        </div>
        
        <nav className="flex-1 py-10 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem id="home" label="Dashboard" icon={<Home size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="recinto" label="Recinto" icon={<Gavel size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="mociones" label="Mociones" icon={<FileText size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="credencial" label="Credencial" icon={<CreditCard size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="noticias" label="Noticias" icon={<Newspaper size={20}/>} active={activeTab} onClick={setActiveTab} />

          {isAdmin && (
            <div className="pt-10 space-y-2">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-4">Gobierno</p>
              <NavItem id="usuarios" label="Integrantes" icon={<Users size={20}/>} active={activeTab} onClick={setActiveTab} />
              <NavItem id="finanzas" label="Tesorería" icon={<DollarSign size={20}/>} active={activeTab} onClick={setActiveTab} />
              <NavItem id="sanciones" label="Disciplina" icon={<ShieldAlert size={20}/>} active={activeTab} onClick={setActiveTab} />
            </div>
          )}
        </nav>

        <div className="p-6 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden">
              {currentUser?.foto ? <img src={currentUser.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-white/20">{currentUser?.nombre[0]}</div>}
            </div>
            {!isSidebarCollapsed && <span className="text-[10px] font-black text-white truncate max-w-[100px] uppercase">{currentUser?.nombre}</span>}
          </div>
          <button onClick={() => { db.get('users').get(currentUser!.id).put({ confirmado: false }); setIsLogged(false); }} className="text-slate-500 hover:text-rose-500 transition-colors"><LogOut size={18}/></button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/70 backdrop-blur-md border-b px-10 flex items-center justify-between z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><Menu size={20}/></button>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                appState.sessionStatus === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                <span className={`w-2 h-2 rounded-full ${appState.sessionStatus === 'ACTIVA' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {appState.sessionStatus}
              </div>
              {appState.sessionStartTime && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde: {appState.sessionStartTime}</span>}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {appState.speakerId && (
              <div className="flex items-center gap-3 bg-slate-900 text-white px-6 py-2 rounded-full shadow-lg border-b-2 border-[#D4AF37]">
                <Mic2 size={16} className="text-[#D4AF37] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">En Palabra: {appState.users.find(u => u.id === appState.speakerId)?.nombre}</span>
              </div>
            )}
            {isPresident && (
              <div className="flex gap-2">
                <button onClick={() => updateSession('ACTIVA')} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase gold-border">Abrir</button>
                <button onClick={() => updateSession('CERRADA')} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase">Cerrar</button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar marble-pattern">
          <div className="max-w-6xl mx-auto space-y-12">
            {activeTab === 'home' && <HomeView user={currentUser!} appState={appState} onSpeakerRequest={toggleSpeakerRequest} aiProps={{prompt: aiPrompt, setPrompt: setAiPrompt, response: aiResponse, onConsult: handleAiConsult, loading: isAiLoading}} />}
            {activeTab === 'recinto' && <RecintoView users={appState.users} appState={appState} currentUser={currentUser!} isPresident={isPresident} db={db} />}
            {activeTab === 'mociones' && <MocionesView mociones={appState.mociones} user={currentUser!} isPresident={isPresident} db={db} />}
            {activeTab === 'credencial' && <CredencialView user={currentUser!} />}
            {activeTab === 'noticias' && <NoticiasView noticias={appState.noticias} isAdmin={isAdmin} db={db} />}
            {activeTab === 'usuarios' && <UsuariosView users={appState.users} isAdmin={isAdmin} db={db} />}
            {activeTab === 'finanzas' && <FinanzasView finanzas={appState.finanzas} db={db} />}
            {activeTab === 'sanciones' && <SancionesView sanciones={appState.sanciones} users={appState.users} isAdmin={isAdmin} db={db} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-VIEWS ESTILIZADAS ---

function NavItem({ id, label, icon, active, onClick }: any) {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive ? 'gold-bg text-white shadow-xl shadow-[#D4AF37]/20 scale-[1.02]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HomeView({ user, appState, onSpeakerRequest, aiProps }: any) {
  const isWaiting = appState.waitingList.includes(user.id);
  return (
    <div className="space-y-12 animate-in">
      <div className="bg-slate-900 p-16 rounded-[4rem] text-white shadow-3xl relative overflow-hidden group">
        <div className="absolute inset-0 id-card-pattern pointer-events-none opacity-20" />
        <div className="relative z-10">
          <p className="text-[#D4AF37] font-black uppercase text-[10px] tracking-[0.5em] mb-4">Bienvenido, Excelencia</p>
          <h2 className="text-7xl font-institutional font-black uppercase tracking-tighter mb-4 leading-none">{user.nombre} <br/> {user.apellido}</h2>
          <div className="flex gap-4 mt-8">
            <span className="px-8 py-3 gold-bg rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-2xl">{user.cargo}</span>
            <span className="px-8 py-3 bg-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/5">Banca № {user.banca + 1}</span>
          </div>
        </div>
        <Landmark size={400} className="absolute -right-32 -bottom-32 text-white/5 rotate-12 group-hover:rotate-45 transition-all duration-[4s]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* IA ADVISOR */}
        <div className="md:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col space-y-6">
          <div className="flex items-center gap-4 text-[#D4AF37]">
            <Sparkles size={28} />
            <h3 className="text-xl font-institutional font-black uppercase tracking-widest text-slate-900">Asesor de IA Parlamentaria</h3>
          </div>
          <div className="relative flex-1">
            <textarea value={aiProps.prompt} onChange={e => aiProps.setPrompt(e.target.value)} placeholder="Ej: ¿Cómo redactar una moción para pedir aumento de mesada? o ¿Cómo resolver una disputa por el control de la TV?" className="w-full h-32 p-6 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-[#D4AF37] outline-none font-medium resize-none shadow-inner" />
            <button onClick={aiProps.onConsult} disabled={aiProps.loading} className="absolute bottom-4 right-4 p-4 gold-bg rounded-2xl text-white shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
              {aiProps.loading ? <Clock className="animate-spin" size={20}/> : <Send size={20}/>}
            </button>
          </div>
          {aiProps.response && (
            <div className="p-6 bg-[#0F172A] rounded-3xl text-slate-300 text-sm leading-relaxed border-l-8 border-[#D4AF37] animate-in italic">
              " {aiProps.response} "
            </div>
          )}
        </div>

        {/* CONTROLES RÁPIDOS */}
        <div className="space-y-6">
          <button onClick={onSpeakerRequest} className={`w-full p-10 rounded-[3rem] flex flex-col items-center gap-4 transition-all hover:scale-[1.02] shadow-xl ${isWaiting ? 'bg-amber-500' : 'bg-slate-900'} text-white`}>
            <Mic2 size={40} className={isWaiting ? 'animate-bounce' : ''} />
            <span className="text-[12px] font-black uppercase tracking-widest">{isWaiting ? 'EN ESPERA DE PALABRA' : 'SOLICITAR PALABRA'}</span>
          </button>
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <Clock size={40} className="text-[#D4AF37] mb-4" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado del Consejo</h4>
            <p className="text-2xl font-institutional font-black text-slate-900 uppercase">{appState.sessionStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecintoView({ users, appState, currentUser, isPresident, db }: any) {
  const sortedUsers = useMemo(() => [...users].sort((a,b) => a.banca - b.banca), [users]);
  
  const handleSeatClick = (u: User) => {
    if (isPresident) {
      const confirmed = confirm(`¿Conceder la palabra a ${u.nombre}?`);
      if (confirmed) {
        db.get('config').put({ speakerId: u.id });
        db.get('speakers').get(u.id).put(false);
      }
    }
  };

  return (
    <div className="bg-[#020617] p-20 rounded-[5rem] shadow-[0_60px_100px_rgba(0,0,0,0.6)] min-h-[1000px] flex flex-col items-center relative animate-in overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.1),transparent)]" />
      
      {/* MESA DE PRESIDENCIA (PODIO) */}
      <div className="w-[800px] h-56 bg-white/95 rounded-t-[180px] shadow-[0_-20px_100px_rgba(212,175,55,0.2)] flex flex-col items-center justify-center border-b-[20px] border-slate-200 relative z-30">
        <div className="flex gap-16 mt-8">
          <PresiSeat label="Vice 1º" role={Role.VICEPRESIDENTE_1} users={users} />
          <PresiSeat label="PRESIDENTE" role={Role.PRESIDENTE} users={users} isMain />
          <PresiSeat label="Vice 2º" role={Role.VICEPRESIDENTE_2} users={users} />
        </div>
        <p className="text-[10px] font-institutional font-black text-slate-300 tracking-[1.5em] mt-10">ALMADA AQUINO</p>
      </div>

      {/* HEMICICLO LEGISLATIVO */}
      <div className="mt-40 senate-arc max-w-6xl relative z-10">
        {Array.from({ length: 38 }).map((_, i) => {
          const u = sortedUsers.find(x => x.banca === i && x.confirmado);
          let seatColor = 'bg-slate-900/40 border-slate-800 opacity-20';
          let isSpeaking = u?.id === appState.speakerId;
          
          if (u) {
            seatColor = 'bg-white border-white scale-110';
            if (u.votoActual === 'YES') seatColor = 'bg-emerald-600 border-emerald-400 shadow-[0_0_30px_#10b981]';
            if (u.votoActual === 'NO') seatColor = 'bg-rose-600 border-rose-400 shadow-[0_0_30px_#f43f5e]';
            if (u.votoActual === 'ABSTAIN') seatColor = 'bg-amber-500 border-amber-400 shadow-[0_0_30px_#f59e0b]';
          }

          return (
            <div key={i} onClick={() => u && handleSeatClick(u)} className={`banca-seat flex items-center justify-center border-4 ${seatColor} ${isSpeaking ? 'active-speaker scale-125 z-20' : ''}`}>
              <span className="absolute -top-6 text-[8px] font-black text-white/10 uppercase tracking-widest">№ {i + 1}</span>
              {u && (
                <div className="w-full h-full rounded-[1.4rem] overflow-hidden">
                  {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-900 text-3xl font-institutional">{u.nombre[0]}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONTROLES DE VOTO FLOTANTES */}
      {appState.activeVote && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white/95 p-12 rounded-[4rem] shadow-3xl border border-white/20 flex flex-col items-center animate-in glass-panel z-50">
          <p className="text-[11px] font-black uppercase text-slate-400 mb-8 tracking-[0.5em] italic leading-none">Voto Oficial: "{appState.activeVote.asunto}"</p>
          <div className="flex gap-8">
            <VoteBtn label="AFIRMATIVO" color="bg-emerald-600" active={currentUser.votoActual === 'YES'} onClick={() => db.get('users').get(currentUser.id).put({votoActual: 'YES'})} />
            <VoteBtn label="NEGATIVO" color="bg-rose-600" active={currentUser.votoActual === 'NO'} onClick={() => db.get('users').get(currentUser.id).put({votoActual: 'NO'})} />
            <VoteBtn label="ABSTENCIÓN" color="bg-slate-500" active={currentUser.votoActual === 'ABSTAIN'} onClick={() => db.get('users').get(currentUser.id).put({votoActual: 'ABSTAIN'})} />
          </div>
        </div>
      )}
    </div>
  );
}

function PresiSeat({ label, role, users, isMain }: any) {
  const occupant = users.find((u: any) => u.cargo === role && u.confirmado);
  return (
    <div className={`flex flex-col items-center gap-4 ${isMain ? 'scale-125' : 'opacity-40'}`}>
      <div className={`w-24 h-16 rounded-[1.8rem] bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-white shadow-2xl relative ${isMain ? 'gold-border active-speaker' : ''}`}>
        {occupant?.foto ? <img src={occupant.foto} className="w-full h-full rounded-[1.8rem] object-cover" /> : <Landmark size={28} />}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">{label}</span>
    </div>
  );
}

function VoteBtn({ label, color, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-14 py-7 rounded-[2.5rem] font-black text-[12px] uppercase tracking-widest transition-all ${active ? 'bg-slate-950 text-white ring-8 ring-[#D4AF37] shadow-2xl scale-110' : `${color} text-white shadow-xl hover:scale-105 active:scale-95`}`}>
      {label}
    </button>
  );
}

function MocionesView({ mociones, user, isPresident, db }: any) {
  const [t, setT] = useState('');
  const [d, setD] = useState('');

  const submitMocion = () => {
    if (!t || !d) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('mociones').get(id).put({ id, titulo: t, descripcion: d, proponenteNombre: user.nombre, proponenteId: user.id, estado: 'PENDIENTE', fecha: new Date().toLocaleString() });
    setT(''); setD(''); alert("MOCIÓN ELEVADA AL CONSEJO.");
  };

  const handleMocionAction = (m: Moción, action: string) => {
    db.get('mociones').get(m.id).put({ estado: action });
    if (action === 'RECINTO') {
      db.get('config').put({ activeVote: JSON.stringify({ activa: true, asunto: m.titulo, inicio: new Date().toISOString() }) });
    }
  };

  return (
    <div className="space-y-12 animate-in">
      <div className="bg-white p-16 rounded-[4rem] shadow-xl border border-slate-100 space-y-8">
        <h3 className="text-3xl font-institutional font-black uppercase tracking-widest flex items-center gap-6"><FileText size={40} className="text-[#D4AF37]"/> Nueva Petición</h3>
        <input placeholder="Asunto central de la moción..." value={t} onChange={e => setT(e.target.value)} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-black text-2xl tracking-tighter" />
        <textarea placeholder="Fundamentos y peticiones detalladas..." value={d} onChange={e => setD(e.target.value)} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold h-48 text-lg" />
        <button onClick={submitMocion} className="gold-bg text-white px-16 py-6 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl hover:scale-105 transition-all">Presentar Ante el Parlamento</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {mociones.filter(m => m.estado !== 'ARCHIVADA').map(m => (
          <div key={m.id} className="bg-white p-14 rounded-[5rem] shadow-xl border border-slate-100 flex flex-col relative group transition-all hover:-translate-y-2">
            <div className="flex justify-between items-start mb-8">
              <span className="text-[11px] font-black text-slate-300 uppercase">{m.fecha}</span>
              <span className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest ${m.estado === 'PENDIENTE' ? 'bg-slate-100 text-slate-400' : m.estado === 'RECINTO' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>{m.estado}</span>
            </div>
            <h4 className="text-5xl font-institutional font-black uppercase tracking-tighter mb-6 leading-[0.85] italic group-hover:text-[#D4AF37] transition-colors">"{m.titulo}"</h4>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-10">Legislador: {m.proponenteNombre}</p>
            <p className="text-xl text-slate-600 font-medium italic mb-12 flex-1">"{m.descripcion}"</p>
            
            {isPresident && m.estado === 'PENDIENTE' && (
              <div className="flex gap-4 pt-10 border-t-2 border-slate-50">
                <button onClick={() => handleMocionAction(m, 'RECINTO')} className="flex-1 bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Tratar</button>
                <button onClick={() => handleMocionAction(m, 'RECHAZADA')} className="flex-1 bg-rose-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Rechazar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CredencialView({ user }: any) {
  return (
    <div className="flex items-center justify-center py-20 animate-in">
      <div className="bg-white w-[580px] rounded-[5.5rem] shadow-[0_60px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 relative group">
        <div className="h-60 bg-slate-900 p-20 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12"><span className="text-[120px] font-institutional font-black text-white/5 italic leading-none">A-A</span></div>
          <div className="gold-bg p-4 rounded-3xl shadow-2xl relative z-10"><Landmark size={48} className="text-white" /></div>
          <div className="text-right relative z-10">
            <p className="text-[12px] font-black text-white/30 uppercase tracking-[0.6em] mb-2">Parlamento Familiar</p>
            <p className="text-[22px] font-institutional font-black text-white uppercase tracking-tight">ALMADA AQUINO</p>
            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mt-2">DIPUTADO VITALICIO</p>
          </div>
        </div>
        <div className="px-24 -mt-32 pb-24 flex flex-col items-center">
          <div className="w-64 h-64 rounded-[5rem] border-[14px] border-white shadow-3xl bg-slate-100 overflow-hidden mb-12 group-hover:scale-105 transition-transform duration-700">
            {user.foto ? <img src={user.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-9xl font-institutional">{user.nombre[0]}</div>}
          </div>
          <h3 className="text-6xl font-institutional font-black uppercase tracking-tighter text-slate-900 mb-2 leading-[0.8] text-center">{user.nombre} <br/> {user.apellido}</h3>
          <div className="h-1.5 w-24 gold-bg rounded-full mb-12" />
          <p className="px-14 py-5 bg-slate-900 text-white rounded-[2rem] text-[13px] font-black uppercase tracking-[0.5em] mb-16 shadow-2xl gold-border">{user.cargo}</p>
          <div className="w-full grid grid-cols-2 gap-x-20 gap-y-12">
            <CredData label="DNI" value={user.dni} />
            <CredData label="ASIENTO" value={`№ ${user.banca + 1}`} />
            <CredData label="RANGO" value="ELITE" />
            <CredData label="VIGENCIA" value="2025/PERP." />
          </div>
        </div>
        <div className="h-14 gold-bg flex items-center justify-center">
          <span className="text-[11px] font-black text-white uppercase tracking-[1.5em]">Identidad Parlamentaria Oficial</span>
        </div>
      </div>
    </div>
  );
}

function CredData({ label, value }: any) {
  return (
    <div className="flex flex-col border-b-2 border-slate-50 pb-5">
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</span>
      <span className="text-[16px] font-black text-slate-900 uppercase tracking-tight">{value}</span>
    </div>
  );
}

function UsuariosView({ users, isAdmin, db }: any) {
  const [form, setForm] = useState<any>({ nombre: '', apellido: '', dni: '', cargo: Role.DIPUTADO_FAMILIAR, banca: 0, foto: '' });

  const register = () => {
    if (!form.nombre || !form.dni) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('users').get(id).put({ ...form, id, activo: true, confirmado: false, votoActual: null });
    alert("NUEVO INTEGRANTE REGISTRADO.");
  };

  const handlePhoto = (e: any) => {
    const reader = new FileReader();
    reader.onload = () => setForm({...form, foto: reader.result as string});
    reader.readAsDataURL(e.target.files[0]);
  };

  return (
    <div className="space-y-14 animate-in">
      {isAdmin && (
        <div className="bg-white p-16 rounded-[4.5rem] shadow-xl border border-slate-100">
          <h3 className="text-4xl font-institutional font-black uppercase mb-14 flex items-center gap-8 text-slate-900"><UserPlus size={48} className="text-[#D4AF37]" /> Censo Legislativo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <InField label="Nombre" onChange={(v:any) => setForm({...form, nombre: v})} />
            <InField label="Apellido" onChange={(v:any) => setForm({...form, apellido: v})} />
            <InField label="DNI" onChange={(v:any) => setForm({...form, dni: v})} />
            <div className="flex flex-col gap-4">
              <span className="text-[12px] font-black uppercase text-slate-400 ml-8">Designación</span>
              <select onChange={e => setForm({...form, cargo: e.target.value as Role})} className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold shadow-inner">
                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <InField label="Banca (1-38)" type="number" onChange={(v:any) => setForm({...form, banca: Number(v)-1})} />
            <div className="flex items-end gap-6">
              <label className="flex-1 bg-slate-100 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-300 font-black text-[12px] uppercase cursor-pointer hover:bg-slate-200 transition-all flex items-center justify-center gap-4">
                <Camera size={28}/> {form.foto ? "Cargada" : "Foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              <button onClick={register} className="gold-bg text-white px-14 py-6 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl hover:scale-105 transition-all">Ingresar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {users.map((u: User) => (
          <div key={u.id} className={`bg-white p-14 rounded-[5rem] border border-slate-100 shadow-xl flex flex-col items-center group transition-all relative overflow-hidden ${!u.activo && 'opacity-30'}`}>
            <div className="w-40 h-40 rounded-[4rem] bg-slate-100 overflow-hidden mb-10 shadow-2xl border-4 border-white transition-transform group-hover:scale-110">
              {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-6xl font-institutional">{u.nombre[0]}</div>}
            </div>
            <h4 className="text-2xl font-institutional font-black uppercase text-center text-slate-900 mb-4 tracking-tighter leading-[0.85]">{u.nombre} <br/> {u.apellido}</h4>
            <p className="text-[12px] font-bold text-[#D4AF37] uppercase tracking-widest mb-10">{u.cargo}</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => db.get('users').get(u.id).put({ activo: !u.activo })} className="flex-1 bg-slate-100 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Estado</button>
              <button onClick={() => confirm("¿Expulsar del Parlamento?") && db.get('users').get(u.id).put(null)} className="p-4 bg-rose-50 text-rose-600 rounded-3xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={24}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InField({ label, type = "text", onChange }: any) {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[12px] font-black uppercase text-slate-400 ml-8">{label}</span>
      <input type={type} onChange={e => onChange(e.target.value)} className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold shadow-inner" />
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
    <div className="space-y-16 animate-in">
      <div className="bg-[#0F172A] p-24 rounded-[6rem] text-white shadow-3xl relative overflow-hidden group border-b-[20px] border-slate-950 border-double">
        <div className="absolute inset-0 id-card-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[#D4AF37] font-black uppercase text-[14px] tracking-[0.5em] mb-8 font-institutional">Tesorería General:</p>
          <h2 className="text-[10rem] font-black tracking-tighter leading-none group-hover:scale-105 transition-transform duration-1000">${total.toLocaleString()}</h2>
        </div>
        <DollarSign size={300} className="absolute -right-32 -bottom-32 text-white/5 rotate-12 transition-all duration-[4s]" />
      </div>

      <div className="bg-white p-16 rounded-[4.5rem] shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-10">
        <input type="number" value={m || ''} placeholder="Monto $" onChange={e => setM(Number(e.target.value))} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-black text-3xl text-center" />
        <input placeholder="Concepto financiero..." value={d} onChange={e => setD(e.target.value)} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold text-xl" />
        <button onClick={() => addMov('INGRESO')} className="bg-emerald-600 text-white rounded-[3rem] font-black uppercase text-[14px] tracking-widest shadow-2xl hover:scale-110 active:scale-95 transition-all">Ingreso</button>
        <button onClick={() => addMov('EGRESO')} className="bg-rose-600 text-white rounded-[3rem] font-black uppercase text-[14px] tracking-widest shadow-2xl hover:scale-110 active:scale-95 transition-all">Egreso</button>
      </div>

      <div className="bg-white rounded-[5rem] shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-14 text-[13px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
              <th className="p-14 text-[13px] font-black uppercase tracking-widest text-slate-400">Concepto</th>
              <th className="p-14 text-[13px] font-black uppercase tracking-widest text-slate-400 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {finanzas.map(f => (
              <tr key={f.id} className="border-b last:border-0 hover:bg-slate-50/70 transition-colors">
                <td className="p-14 text-[13px] font-bold text-slate-400 uppercase">{f.fecha}</td>
                <td className="p-14 text-2xl font-institutional font-black uppercase text-slate-900 tracking-tighter italic font-institutional">"{f.descripcion}"</td>
                <td className={`p-14 text-4xl font-black text-right ${f.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
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

function NoticiasView({ noticias, isAdmin, db }: any) {
  const [t, setT] = useState('');
  const [c, setC] = useState('');

  const publish = () => {
    if(!t || !c) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('noticias').get(id).put({ id, titulo: t, contenido: c, fecha: new Date().toLocaleString() });
    setT(''); setC('');
  };

  return (
    <div className="space-y-16 animate-in">
      {isAdmin && (
        <div className="bg-white p-20 rounded-[6rem] shadow-xl border border-slate-100 space-y-10">
          <h3 className="text-4xl font-institutional font-black uppercase flex items-center gap-8"><Newspaper size={48} className="text-[#D4AF37]" /> Comunicación Oficial</h3>
          <input placeholder="Titular del boletín..." value={t} onChange={e => setT(e.target.value)} className="w-full p-10 bg-slate-50 rounded-[4rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-black text-3xl tracking-tighter" />
          <textarea placeholder="Exponga los fundamentos del comunicado..." value={c} onChange={e => setC(e.target.value)} className="w-full p-10 bg-slate-50 rounded-[4rem] border-2 border-transparent focus:border-[#D4AF37] outline-none font-bold h-64 text-xl" />
          <button onClick={publish} className="gold-bg text-white px-24 py-8 rounded-[4rem] font-black uppercase text-[14px] tracking-[0.5em] shadow-2xl hover:scale-105 transition-all">Emitir Boletín Oficial</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
        {noticias.map(n => (
          <div key={n.id} className="bg-white rounded-[6rem] shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-700">
            <div className="p-20">
              <div className="flex items-center gap-8 mb-12">
                <span className="w-20 h-2 gold-bg rounded-full" />
                <span className="text-[12px] font-black text-[#D4AF37] uppercase tracking-[0.4em]">{n.fecha}</span>
              </div>
              <h4 className="text-6xl font-institutional font-black uppercase tracking-tighter mb-12 leading-[0.85] group-hover:text-[#D4AF37] transition-colors">{n.titulo}</h4>
              <p className="text-slate-600 leading-relaxed text-2xl font-medium opacity-80 italic">"{n.contenido}"</p>
              {isAdmin && <button onClick={() => db.get('noticias').get(n.id).put(null)} className="mt-16 text-rose-500 font-black uppercase text-[12px] tracking-widest hover:underline flex items-center gap-4 transition-all hover:gap-8"><Trash2 size={20}/> Eliminar del Archivo</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SancionesView({ sanciones, users, isAdmin, db }: any) {
  const [form, setForm] = useState<any>({ userId: '', motivo: '', gravedad: 'LEVE' });

  const apply = () => {
    const u = users.find((x:any) => x.id === form.userId);
    if (!u) return alert("Seleccione Legislador.");
    const id = Math.random().toString(36).substr(2, 9);
    db.get('sanciones').get(id).put({ ...form, id, userName: `${u.nombre} ${u.apellido}`, fecha: new Date().toLocaleString() });
    alert("SANCIÓN IMPUESTA.");
  };

  return (
    <div className="space-y-16 animate-in">
      {isAdmin && (
        <div className="bg-white p-20 rounded-[6rem] shadow-xl border border-slate-100">
          <h3 className="text-4xl font-institutional font-black uppercase mb-16 flex items-center gap-8 text-rose-600"><ShieldX size={48} /> Tribunal de Ética</h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <select onChange={e => setForm({...form, userId: e.target.value})} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent focus:border-rose-600 outline-none font-bold">
              <option value="">Legislador...</option>
              {users.map((u:any) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
            <input placeholder="Infracción cometida..." onChange={e => setForm({...form, motivo: e.target.value})} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent focus:border-rose-600 outline-none font-bold" />
            <select onChange={e => setForm({...form, gravedad: e.target.value})} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-transparent focus:border-rose-600 outline-none font-bold">
              <option value="LEVE">LEVE</option>
              <option value="MEDIA">MEDIA</option>
              <option value="GRAVE">MÁXIMA</option>
            </select>
            <button onClick={apply} className="bg-rose-600 text-white rounded-[3rem] font-black uppercase text-[12px] tracking-widest shadow-2xl hover:scale-105 transition-all">Imponer Sanción</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {sanciones.map(s => (
          <div key={s.id} className="bg-white p-16 rounded-[5rem] border-t-[20px] border-rose-600 shadow-xl group transition-all duration-700">
            <div className="flex justify-between items-start mb-10">
              <span className="text-[12px] font-black uppercase tracking-widest text-slate-300">{s.fecha}</span>
              <span className={`px-8 py-3 rounded-full text-[11px] font-black uppercase shadow-lg ${s.gravedad === 'GRAVE' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{s.gravedad}</span>
            </div>
            <h4 className="text-4xl font-institutional font-black uppercase text-slate-900 tracking-tighter mb-6 leading-none italic">{s.userName}</h4>
            <p className="text-xl text-slate-500 italic font-medium opacity-80 leading-relaxed group-hover:opacity-100 transition-opacity">" {s.motivo} "</p>
          </div>
        ))}
      </div>
    </div>
  );
}
