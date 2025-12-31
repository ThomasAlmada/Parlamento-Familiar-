
import React, { useState, useEffect, useMemo } from 'react';
import { Role, User, Moción, AppState, VoteType, SessionStatus, VotoGuardado, Acta } from './types';
import { INITIAL_USERS } from './constants';
import { 
  Users, LogOut, Menu, Mic2, FileText, 
  Landmark, Home, DollarSign, 
  ShieldAlert, Newspaper, Camera, UserPlus, CreditCard, ShieldX, CheckCircle2, XCircle, Gavel, Sparkles, Send,
  Clock, Trash2, ChevronRight, Activity, ShieldCheck, Crown, Music, Tv, Book, Archive, Gamepad2, Play, Eraser, FileBox, ScrollText, History, Info, BrainCircuit
} from 'lucide-react';
import Gun from 'gun';
import { geminiAssistant } from './geminiService';

const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
  localStorage: true
});

const DB_KEY = 'PARLAMENTO_AA_V5_STABLE';
const db = gun.get(DB_KEY);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  
  const [appState, setAppState] = useState<AppState>({
    users: INITIAL_USERS,
    mociones: [],
    finanzas: [],
    votosHistorial: [],
    actas: [],
    activeVote: null,
    sessionStatus: 'CERRADA',
    speakerId: null,
    proyeccion: { tipo: 'NADA' },
    sessionStartTime: null
  });

  useEffect(() => {
    // Escuchar cambios globales
    db.get('config').on((data: any) => {
      if (!data) return;
      setAppState(prev => ({
        ...prev,
        sessionStatus: data.status || 'CERRADA',
        sessionStartTime: data.startTime,
        speakerId: data.speakerId,
        activeVote: data.activeVote ? JSON.parse(data.activeVote) : null,
        proyeccion: data.proyeccion ? JSON.parse(data.proyeccion) : { tipo: 'NADA' }
      }));
    });

    // Escuchar usuarios
    db.get('users').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        const users = [...prev.users];
        const idx = users.findIndex(u => u.id === id);
        const newUser = { ...data, id };
        if (idx !== -1) {
          users[idx] = newUser;
          return { ...prev, users };
        }
        return { ...prev, users: [...users, newUser] };
      });
    });

    // Escuchar historial de votos
    db.get('votos_historial').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        if (prev.votosHistorial.find(v => v.id === id)) return prev;
        return { ...prev, votosHistorial: [...prev.votosHistorial, { ...data, id }] };
      });
    });

    // Escuchar actas
    db.get('actas').map().on((data: any, id: string) => {
      if (!data) return;
      setAppState(prev => {
        if (prev.actas.find(a => a.id === id)) return prev;
        return { ...prev, actas: [...prev.actas, { ...data, id }] };
      });
    });

    // Escuchar finanzas y mociones
    db.get('finanzas').map().on((data: any, id: string) => {
        if (!data) return;
        setAppState(prev => {
          if (prev.finanzas.find(f => f.id === id)) return prev;
          return { ...prev, finanzas: [...prev.finanzas, { ...data, id }] };
        });
    });
    db.get('mociones').map().on((data: any, id: string) => {
        if (!data) return;
        setAppState(prev => {
          const idx = prev.mociones.findIndex(m => m.id === id);
          if (idx !== -1) {
            const list = [...prev.mociones];
            list[idx] = { ...data, id };
            return { ...prev, mociones: list };
          }
          return { ...prev, mociones: [...prev.mociones, { ...data, id }] };
        });
    });
  }, []);

  const isAdmin = currentUser?.dni === '49993070';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = appState.users.find(u => u.dni === dniInput && (u.password === passInput || u.dni === passInput));
    if (found) {
      setCurrentUser(found);
      setIsLogged(true);
      db.get('users').get(found.id).put({ presente: true, confirmado: true });
    } else {
      alert("CREDENCIALES INCORRECTAS");
    }
  };

  const updateSession = (status: SessionStatus) => {
    if (!isAdmin) return;
    db.get('config').put({ 
      status, 
      startTime: status === 'ACTIVA' ? new Date().toLocaleTimeString() : appState.sessionStartTime 
    });
  };

  const setProyeccion = (tipo: any, titulo?: string, subtitulo?: string) => {
    db.get('config').put({ proyeccion: JSON.stringify({ tipo, titulo, subtitulo }) });
  };

  const cerrarVotacion = () => {
    if (!appState.activeVote) return;
    const votantes = appState.users.filter(u => u.confirmado && u.votoActual);
    const si = votantes.filter(v => v.votoActual === 'YES').length;
    const no = votantes.filter(v => v.votoActual === 'NO').length;
    const abs = votantes.filter(v => v.votoActual === 'ABSTAIN').length;
    
    const id = Math.random().toString(36).substr(2, 9);
    const resultado = si > no ? 'APROBADA' : 'RECHAZADA';
    
    // Detalle por persona
    const detallesStr = votantes.map(v => `${v.nombre} ${v.apellido}: ${v.votoActual === 'YES' ? 'Afirmativo' : v.votoActual === 'NO' ? 'Negativo' : 'Abstención'}`).join(', ');
    const textoFinal = `Ha sido ${resultado.toLowerCase()} por la mayoría de votos (${si}). ${detallesStr}`;

    const votoData: VotoGuardado = {
      id,
      asunto: appState.activeVote.asunto,
      fecha: new Date().toLocaleString(),
      resultado,
      totalSi: si,
      totalNo: no,
      totalAbstencion: abs,
      textoDetalle: textoFinal
    };

    db.get('votos_historial').get(id).put(votoData);
    
    // Reset votos
    appState.users.forEach(u => {
      db.get('users').get(u.id).put({ votoActual: null });
    });

    db.get('config').put({ activeVote: null });
    setProyeccion('RESULTADO', resultado, `Votos: ${si} AF, ${no} NEG, ${abs} ABS`);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center marble-pattern p-6">
        <div className="w-full max-w-lg bg-white p-16 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-t-[14px] border-[#D4AF37] text-center animate-in">
          <div className="w-24 h-24 gold-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
            <Landmark size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-institutional font-black text-slate-900 mb-2 uppercase">Parlamento Familiar</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.8em] mb-12">Almada Aquino • Lista 001</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full p-6 rounded-[1.8rem] bg-slate-50 border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold text-center text-2xl shadow-inner transition-all" placeholder="DNI" />
            <input type="password" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full p-6 rounded-[1.8rem] bg-slate-50 border-2 border-slate-100 focus:border-[#D4AF37] outline-none font-bold text-center text-2xl shadow-inner transition-all" placeholder="CLAVE" />
            <button className="w-full gold-gradient py-7 rounded-[1.8rem] font-black text-white uppercase text-lg shadow-xl hover:scale-105 active:scale-95 transition-all">Ingresar al Recinto</button>
          </form>
          <p className="mt-12 text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Puerto Esperanza • Misiones</p>
        </div>
      </div>
    );
  }

  // Fallback para evitar el error de lectura [0]
  const userName = currentUser?.nombre || 'Legislador';
  const userInitial = userName?.[0] || 'L';

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} navy-gradient flex flex-col transition-all duration-500 shadow-2xl z-50 border-r border-[#D4AF37]/30`}>
        <div className="h-28 flex items-center px-8 bg-black/30 border-b border-white/5">
          <Landmark size={28} className="text-[#D4AF37]" />
          {!isSidebarCollapsed && <span className="ml-4 font-institutional font-black text-white text-[10px] tracking-[0.3em] uppercase truncate">Parlamento AA</span>}
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem id="home" label="Dashboard" icon={<Home size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="proyeccion" label="Proyección" icon={<Tv size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="recinto" label="El Recinto" icon={<Gavel size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="mociones" label="Mociones" icon={<FileText size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="historial" label="Leyes Aprobadas" icon={<Archive size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="secretarias" label="Secretarías" icon={<FileBox size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="estatutos" label="Estatutos y Ley" icon={<ScrollText size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="juegos" label="Juegos y Receso" icon={<Gamepad2 size={20}/>} active={activeTab} onClick={setActiveTab} />
          <NavItem id="advisor" label="Asesor Superior" icon={<BrainCircuit size={20}/>} active={activeTab} onClick={setActiveTab} />

          {isAdmin && (
            <div className="pt-8 space-y-2">
              <p className="text-[9px] font-black text-[#D4AF37] uppercase px-4 mb-3 opacity-70 tracking-widest">Presidencia</p>
              <NavItem id="sesion_master" label="Parte de la Sesión" icon={<Play size={20}/>} active={activeTab} onClick={setActiveTab} />
              <NavItem id="censo" label="Censo Legislativo" icon={<Users size={20}/>} active={activeTab} onClick={setActiveTab} />
              <NavItem id="finanzas" label="Tesorería" icon={<DollarSign size={20}/>} active={activeTab} onClick={setActiveTab} />
            </div>
          )}
        </nav>

        <div className="p-6 bg-black/50 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-[#D4AF37] overflow-hidden shadow-xl transform rotate-3">
              {currentUser?.foto ? <img src={currentUser.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-white/20 uppercase text-lg font-institutional">{userInitial}</div>}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{currentUser?.nombre}</span>
                <span className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest mt-0.5">{currentUser?.cargo}</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsLogged(false)} className="text-slate-500 hover:text-rose-500 transition-all"><LogOut size={22}/></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white/95 backdrop-blur-xl border-b px-12 flex items-center justify-between z-40">
          <div className="flex items-center gap-10">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-xl"><Menu size={24}/></button>
            <div className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                appState.sessionStatus === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' : 
                appState.sessionStatus === 'CUARTO_INTERMEDIO' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                SESIÓN: {appState.sessionStatus}
            </div>
          </div>

          <div className="flex items-center gap-8">
            {appState.speakerId && (
              <div className="flex items-center gap-4 bg-[#020617] text-white px-8 py-3 rounded-full shadow-2xl border-b-2 border-[#D4AF37]">
                <Activity size={16} className="text-[#D4AF37] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">En Palabra: {appState.users.find(u => u.id === appState.speakerId)?.nombre}</span>
              </div>
            )}
            <button onClick={() => db.get('users').get(currentUser?.id!).put({ presente: !currentUser?.presente })} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${currentUser?.presente ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {currentUser?.presente ? 'PRESENTE' : 'DAR PRESENTE'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar marble-pattern relative">
          <div className="max-w-[85rem] mx-auto space-y-16">
            {activeTab === 'home' && <HomeView user={currentUser!} appState={appState} />}
            {activeTab === 'proyeccion' && <ProyeccionView appState={appState} />}
            {activeTab === 'recinto' && <RecintoView users={appState.users} appState={appState} currentUser={currentUser!} isAdmin={isAdmin} db={db} />}
            {activeTab === 'mociones' && <MocionesView mociones={appState.mociones} user={currentUser!} isAdmin={isAdmin} db={db} />}
            {activeTab === 'sesion_master' && <SesionMasterView appState={appState} updateSession={updateSession} db={db} cerrarVotacion={cerrarVotacion} setProyeccion={setProyeccion} />}
            {activeTab === 'censo' && <CensoView users={appState.users} isAdmin={isAdmin} db={db} />}
            {activeTab === 'historial' && <HistorialView historial={appState.votosHistorial} />}
            {activeTab === 'finanzas' && <FinanzasView finanzas={appState.finanzas} db={db} />}
            {activeTab === 'secretarias' && <SecretariasView />}
            {activeTab === 'estatutos' && <EstatutosView />}
            {activeTab === 'juegos' && <JuegosView />}
            {activeTab === 'advisor' && <AdvisorView />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES ---

function NavItem({ id, label, icon, active, onClick }: any) {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all duration-300 ${isActive ? 'gold-gradient text-white shadow-2xl scale-[1.05]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
      {icon}
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HomeView({ user, appState }: any) {
  return (
    <div className="space-y-16">
      <div className="navy-gradient p-20 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group border-b-[20px] border-[#D4AF37]">
        <div className="absolute inset-0 marble-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[#D4AF37] font-black uppercase text-[14px] tracking-[0.8em] mb-6 font-institutional">Honorable Legislador AA</p>
          <h2 className="text-[7rem] font-institutional font-black uppercase tracking-tighter mb-4 italic leading-tight">{user.nombre} <br/> {user.apellido}</h2>
          <div className="flex gap-4 mt-10">
            <span className="px-10 py-4 gold-gradient rounded-full text-[12px] font-black uppercase tracking-widest text-white shadow-2xl flex items-center gap-3"><Crown size={18}/> {user.cargo}</span>
            <span className="px-10 py-4 bg-white/10 rounded-full text-[12px] font-black uppercase tracking-widest border border-white/5 backdrop-blur-xl">Banca № {user.banca + 1}</span>
          </div>
        </div>
        <Landmark size={500} className="absolute -right-20 -bottom-20 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <StatCard title="Estado Actual" value={user.presente ? 'EN EL RECINTO' : 'AUSENTE'} color={user.presente ? 'text-emerald-500' : 'text-rose-500'} />
        <StatCard title="Sesión Activa" value={appState.sessionStatus} color="text-amber-500" />
        <StatCard title="Quórum Familiar" value={`${appState.users.filter(u => u.presente).length} / ${appState.users.length}`} color="text-slate-900" />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: any) {
  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-xl border-b-8 border-slate-50 text-center">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title}</h3>
      <p className={`text-3xl font-institutional font-black uppercase ${color}`}>{value}</p>
    </div>
  );
}

function ProyeccionView({ appState }: any) {
  const visible = appState.sessionStatus !== 'CERRADA';

  if (!visible) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center bg-slate-900 rounded-[4rem] text-center p-20 shadow-2xl border-b-[20px] border-slate-800">
        <Tv size={100} className="text-slate-800 mb-10" />
        <h2 className="text-4xl font-institutional font-black text-slate-700 uppercase">Proyección Desactivada</h2>
        <p className="text-slate-600 uppercase tracking-widest mt-4">La pantalla cobrará vida cuando inicie la sesión oficial</p>
      </div>
    );
  }

  return (
    <div className="min-h-[750px] bg-[#020617] rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-20 text-center border-b-[25px] border-[#D4AF37]">
      <div className="absolute inset-0 marble-pattern opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.08),transparent)]" />
      
      {appState.proyeccion.tipo === 'HIMNO' && (
        <div className="animate-in space-y-12">
          <Music size={120} className="text-[#D4AF37] mx-auto animate-bounce" />
          <h2 className="text-7xl font-institutional font-black text-white uppercase italic">{appState.proyeccion.titulo}</h2>
          <div className="w-64 h-2 gold-gradient mx-auto rounded-full shadow-[0_0_40px_rgba(212,175,55,0.5)]" />
          <p className="text-3xl text-slate-400 font-bold uppercase tracking-[0.8em]">Silencio y Respeto</p>
        </div>
      )}

      {appState.proyeccion.tipo === 'HOMENAJE' && (
        <div className="animate-in space-y-12">
          <Sparkles size={120} className="text-[#D4AF37] mx-auto animate-pulse" />
          <h2 className="text-7xl font-institutional font-black text-white uppercase italic">MOMENTO DE LOS HOMENAJES</h2>
          <p className="text-4xl text-slate-400 font-medium">Memoria Viva del Parlamento Familiar.</p>
        </div>
      )}

      {appState.proyeccion.tipo === 'RESULTADO' && (
        <div className="animate-in space-y-10">
          <div className={`w-40 h-40 rounded-full mx-auto flex items-center justify-center border-8 ${appState.proyeccion.titulo === 'APROBADA' ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'} shadow-2xl`}>
             {appState.proyeccion.titulo === 'APROBADA' ? <CheckCircle2 size={80} /> : <XCircle size={80} />}
          </div>
          <h2 className="text-8xl font-institutional font-black text-white uppercase">VOTACIÓN {appState.proyeccion.titulo}</h2>
          <p className="text-4xl text-[#D4AF37] font-black uppercase tracking-widest">{appState.proyeccion.subtitulo}</p>
        </div>
      )}

      {appState.proyeccion.tipo === 'NADA' && (
        <div className="animate-in space-y-10 opacity-20">
          <Landmark size={200} className="text-white mx-auto" />
          <h2 className="text-2xl font-institutional font-black text-white uppercase tracking-[1.5em]">Gran Recinto Almada Aquino</h2>
        </div>
      )}
    </div>
  );
}

function SesionMasterView({ appState, updateSession, db, cerrarVotacion, setProyeccion }: any) {
  const pedidosPalabra = appState.users.filter((u: User) => u.pedirPalabra === 'ESPERA');

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* CONTROL DE SESIÓN */}
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-8 border-l-[15px] border-emerald-600">
          <h3 className="text-2xl font-institutional font-black uppercase flex items-center gap-4"><Play size={28} className="text-emerald-600"/> Mando Superior</h3>
          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => updateSession('ACTIVA')} className="bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:brightness-110">Abrir Sesión</button>
            <button onClick={() => updateSession('CUARTO_INTERMEDIO')} className="bg-amber-600 text-white py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:brightness-110">Intermedio</button>
            <button onClick={() => updateSession('CERRADA')} className="bg-rose-900 text-white py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:brightness-110">Cerrar Sesión</button>
          </div>
        </div>

        {/* PARTE DE LA SESIÓN (HIMNOS) */}
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-8 border-l-[15px] border-[#D4AF37]">
          <h3 className="text-2xl font-institutional font-black uppercase flex items-center gap-4"><Music size={28} className="text-[#D4AF37]"/> Parte de la Sesión</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setProyeccion('HIMNO', 'Himno Nacional Argentino')} className="bg-slate-50 text-slate-900 py-5 rounded-xl font-black uppercase text-[9px] border border-slate-100 flex items-center justify-center gap-2 hover:bg-white"><Music size={14}/> Himno Nacional</button>
            <button onClick={() => setProyeccion('HIMNO', 'Himno a Misiones')} className="bg-slate-50 text-slate-900 py-5 rounded-xl font-black uppercase text-[9px] border border-slate-100 flex items-center justify-center gap-2 hover:bg-white"><Music size={14}/> Himno Misiones</button>
            <button onClick={() => setProyeccion('HIMNO', 'Himno Puerto Esperanza')} className="bg-slate-50 text-slate-900 py-5 rounded-xl font-black uppercase text-[9px] border border-slate-100 flex items-center justify-center gap-2 hover:bg-white"><Music size={14}/> Himno P. Esperanza</button>
            <button onClick={() => setProyeccion('HOMENAJE')} className="bg-slate-50 text-slate-900 py-5 rounded-xl font-black uppercase text-[9px] border border-slate-100 flex items-center justify-center gap-2 hover:bg-white"><Sparkles size={14}/> Homenajes</button>
            <button onClick={() => setProyeccion('NADA')} className="col-span-2 bg-[#020617] text-white py-5 rounded-2xl font-black uppercase text-[9px] tracking-[0.4em] flex items-center justify-center gap-3 hover:brightness-150 transition-all"><Eraser size={18}/> Limpiar Pantalla de Proyección</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* PEDIDOS DE PALABRA */}
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-6">
          <h3 className="text-2xl font-institutional font-black uppercase flex items-center gap-4 text-[#D4AF37]"><Mic2 size={28}/> Lista de Oradores</h3>
          <div className="space-y-3">
            {pedidosPalabra.length === 0 && <p className="text-[11px] text-slate-400 italic text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed">No hay pedidos pendientes.</p>}
            {pedidosPalabra.map((u: User) => (
              <div key={u.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 group hover:border-[#D4AF37] transition-all">
                <span className="text-[13px] font-black uppercase tracking-tight">{u.nombre} {u.apellido}</span>
                <button onClick={() => { db.get('config').put({ speakerId: u.id }); db.get('users').get(u.id).put({ pedirPalabra: 'CONCEDIDA' }); }} className="px-8 py-3 gold-gradient text-white rounded-full text-[10px] font-black uppercase shadow-xl hover:scale-105 transition-all">Conceder</button>
              </div>
            ))}
          </div>
        </div>

        {/* CONTROL DE VOTACIÓN ACTIVA */}
        {appState.activeVote && (
          <div className="bg-slate-950 p-12 rounded-[3.5rem] shadow-2xl text-center flex flex-col items-center justify-center space-y-10 border-b-[20px] border-[#D4AF37]">
            <h4 className="text-white text-2xl font-institutional font-black uppercase italic leading-none">Votación en Curso: <br/> <span className="text-[#D4AF37] text-3xl">"{appState.activeVote.asunto}"</span></h4>
            <button onClick={cerrarVotacion} className="gold-gradient px-12 py-5 rounded-full text-white font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-110 active:scale-95 transition-all">Cerrar Escrutinio y Guardar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CensoView({ users, isAdmin, db }: any) {
  const [form, setForm] = useState<any>({ nombre: '', apellido: '', dni: '', cargo: Role.DIPUTADO_FAMILIAR, banca: 0 });

  const register = () => {
    if (!form.nombre || !form.dni) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('users').get(id).put({ ...form, id, activo: true, confirmado: false, presente: false, password: form.dni });
    alert("DIPLOMÁTICO REGISTRADO.");
  };

  return (
    <div className="space-y-12">
      {isAdmin && (
        <div className="bg-white p-12 rounded-[4rem] shadow-xl space-y-8 border-t-[10px] border-[#D4AF37]">
          <h3 className="text-3xl font-institutional font-black uppercase flex items-center gap-6"><UserPlus size={36} className="text-[#D4AF37]"/> Registro del Censo AA</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <input placeholder="Nombre" onChange={e => setForm({...form, nombre: e.target.value})} className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" />
            <input placeholder="Apellido" onChange={e => setForm({...form, apellido: e.target.value})} className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" />
            <input placeholder="DNI" onChange={e => setForm({...form, dni: e.target.value})} className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold" />
            <button onClick={register} className="gold-gradient text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">Confirmar Legajo</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {users.sort((a:any, b:any) => a.banca - b.banca).map((u: User) => (
          <div key={u.id} className="bg-white p-10 rounded-[3.5rem] shadow-xl flex flex-col items-center text-center group border-2 border-slate-50 hover:border-[#D4AF37] transition-all relative overflow-hidden">
            <div className="w-36 h-36 rounded-[2.5rem] bg-slate-100 overflow-hidden mb-6 border-4 border-white shadow-2xl group-hover:scale-110 transition-all">
              {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300 font-institutional">{u.nombre?.[0] || 'L'}</div>}
            </div>
            <h4 className="text-2xl font-institutional font-black uppercase leading-[0.8] mb-4 italic">{u.nombre} <br/> {u.apellido}</h4>
            <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-6">{u.cargo}</span>
            <div className="flex gap-3">
              {isAdmin && <button onClick={() => { const url = prompt("URL de Foto:"); if(url) db.get('users').get(u.id).put({ foto: url }) }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#D4AF37] hover:text-white transition-all"><Camera size={18}/></button>}
              {isAdmin && <button onClick={() => { if(confirm("¿Eliminar?")) db.get('users').get(u.id).put(null); }} className="p-3 bg-rose-50 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>}
            </div>
            <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${u.presente ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecintoView({ users, appState, currentUser, isAdmin, db }: any) {
  const handleVoto = (tipo: VoteType) => {
    db.get('users').get(currentUser.id).put({ votoActual: tipo });
  };

  const solicitarPalabra = () => {
    db.get('users').get(currentUser.id).put({ pedirPalabra: 'ESPERA' });
    alert("PEDIDO DE PALABRA ELEVADO A PRESIDENCIA.");
  };

  return (
    <div className="bg-[#020617] p-24 rounded-[5rem] min-h-[1000px] flex flex-col items-center relative overflow-hidden shadow-[0_80px_150px_-40px_rgba(0,0,0,0.8)] border-b-[20px] border-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent)] pointer-events-none" />
      
      {/* ESTRADO */}
      <div className="w-[850px] h-44 bg-white/95 rounded-t-[160px] shadow-[0_-15px_80px_rgba(212,175,55,0.15)] flex flex-col items-center justify-center border-b-[20px] border-slate-200 relative z-30">
        <Landmark size={44} className="text-[#D4AF37] mb-3" />
        <p className="text-[11px] font-institutional font-black text-slate-400 tracking-[1.2em] uppercase italic">Estrado Superior AA</p>
      </div>

      {/* HEMICICLO */}
      <div className="mt-36 senate-arc max-w-[110rem] relative z-10 px-10">
        {Array.from({ length: 38 }).map((_, i) => {
          const u = users.find((x:any) => x.banca === i && x.confirmado && x.presente);
          let seatBase = 'bg-slate-900/40 border-slate-800 opacity-20';
          let isSpeaking = u?.id === appState.speakerId;
          
          if (u) {
            seatBase = 'bg-white border-white scale-110 shadow-2xl';
            if (u.votoActual === 'YES') seatBase = 'bg-emerald-600 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]';
            if (u.votoActual === 'NO') seatBase = 'bg-rose-600 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.5)]';
            if (u.votoActual === 'ABSTAIN') seatBase = 'bg-amber-500 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.5)]';
          }

          return (
            <div key={i} className={`banca-seat flex items-center justify-center border-[3px] ${seatBase} ${isSpeaking ? 'active-speaker scale-[1.4]' : ''}`}>
              <span className="absolute -top-8 text-[8px] font-black text-white/20 uppercase tracking-widest italic">{i + 1}</span>
              {u && (
                <div className="w-full h-full rounded-[1.1rem] overflow-hidden">
                  {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-900 text-2xl font-institutional">{u.nombre?.[0] || 'L'}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONTROLES FLOTANTES */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-6 z-50">
        <button onClick={solicitarPalabra} className="px-10 py-4 bg-slate-950 text-white rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl border-2 border-[#D4AF37]/40 hover:gold-gradient hover:scale-110 transition-all flex items-center gap-3">
           <Mic2 size={16} className="text-[#D4AF37]" /> Pedir Palabra
        </button>
        
        {appState.activeVote && (
          <div className="bg-white/95 p-8 rounded-[3.5rem] shadow-2xl flex flex-col items-center border-[3px] border-[#D4AF37]/30 backdrop-blur-3xl animate-in">
            <p className="text-[9px] font-black uppercase text-slate-400 mb-5 tracking-[0.3em] font-institutional">Emisión de Voto: {appState.activeVote.asunto}</p>
            <div className="flex gap-3">
              <button onClick={() => handleVoto('YES')} className={`px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${currentUser.votoActual === 'YES' ? 'bg-emerald-600 text-white scale-110 shadow-2xl border-4 border-emerald-300' : 'bg-slate-100 text-emerald-600 hover:bg-emerald-50'}`}>Positivo</button>
              <button onClick={() => handleVoto('NO')} className={`px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${currentUser.votoActual === 'NO' ? 'bg-rose-600 text-white scale-110 shadow-2xl border-4 border-rose-300' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'}`}>Negativo</button>
              <button onClick={() => handleVoto('ABSTAIN')} className={`px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${currentUser.votoActual === 'ABSTAIN' ? 'bg-amber-500 text-white scale-110 shadow-2xl border-4 border-amber-200' : 'bg-slate-100 text-amber-600 hover:bg-amber-50'}`}>Abstención</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistorialView({ historial }: { historial: VotoGuardado[] }) {
  return (
    <div className="space-y-12">
      <h3 className="text-4xl font-institutional font-black uppercase border-b-4 border-[#D4AF37] inline-block pb-3">Archivo Histórico Legislativo</h3>
      <div className="space-y-10">
        {historial.length === 0 && <p className="text-slate-400 italic text-2xl p-20 text-center">No hay leyes archivadas.</p>}
        {historial.sort((a,b) => b.fecha.localeCompare(a.fecha)).map(v => (
          <div key={v.id} className="bg-white p-12 rounded-[3.5rem] shadow-xl border-l-[20px] border-[#D4AF37] group hover:translate-x-3 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{v.fecha}</span>
              <span className={`px-8 py-2.5 rounded-full text-[11px] font-black uppercase shadow-sm ${v.resultado === 'APROBADA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{v.resultado}</span>
            </div>
            <h4 className="text-4xl font-institutional font-black uppercase mb-8 leading-tight italic">"{v.asunto}"</h4>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100">
               <div className="flex items-center gap-4 text-slate-700">
                 <Info size={22} className="text-[#D4AF37]" />
                 <p className="text-[13px] font-black uppercase italic leading-relaxed">{v.textoDetalle}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MocionesView({ mociones, user, isAdmin, db }: any) {
  const [t, setT] = useState('');
  const [d, setD] = useState('');

  const submit = () => {
    if (!t || !d) return;
    const id = Math.random().toString(36).substr(2, 9);
    db.get('mociones').get(id).put({ id, titulo: t, descripcion: d, proponenteNombre: user.nombre, proponenteId: user.id, estado: 'PENDIENTE', fecha: new Date().toLocaleString() });
    setT(''); setD(''); alert("MOCIÓN ENVIADA.");
  };

  const llevarRecinto = (m: any) => {
    db.get('config').put({ activeVote: JSON.stringify({ activa: true, asunto: m.titulo, idMocion: m.id }) });
    db.get('mociones').get(m.id).put({ estado: 'RECINTO' });
  };

  return (
    <div className="space-y-12">
      <div className="bg-white p-14 rounded-[3.5rem] shadow-xl space-y-8 border-t-[10px] border-[#D4AF37]">
        <h3 className="text-3xl font-institutional font-black uppercase flex items-center gap-5 text-[#D4AF37]"><FileText size={36}/> Nueva Moción</h3>
        <input placeholder="Titular de la propuesta..." value={t} onChange={e => setT(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 font-black text-2xl shadow-inner outline-none focus:border-[#D4AF37]" />
        <textarea placeholder="Explicación detallada de la propuesta..." value={d} onChange={e => setD(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 font-bold h-44 shadow-inner outline-none focus:border-[#D4AF37] text-lg" />
        <button onClick={submit} className="gold-gradient text-white px-12 py-5 rounded-full font-black uppercase text-[12px] shadow-2xl italic tracking-widest hover:scale-105 transition-all">Elevar Moción al Recinto</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {mociones.filter(m => m.estado !== 'ARCHIVADA').sort((a,b) => b.fecha.localeCompare(a.fecha)).map(m => (
          <div key={m.id} className="bg-white p-10 rounded-[3.5rem] shadow-xl border-l-[15px] border-slate-100 flex flex-col group hover:-translate-y-2 transition-all">
            <span className="text-[9px] font-black text-slate-300 uppercase mb-4 tracking-widest">{m.fecha}</span>
            <h4 className="text-3xl font-institutional font-black uppercase mb-5 italic leading-none group-hover:text-[#D4AF37]">"{m.titulo}"</h4>
            <p className="text-slate-500 text-lg italic mb-10 flex-1 leading-relaxed">"{m.descripcion}"</p>
            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
               <span className="text-[9px] font-bold text-slate-400 uppercase">Proponente: <span className="text-slate-900">{m.proponenteNombre}</span></span>
               {isAdmin && m.estado === 'PENDIENTE' && (
                <button onClick={() => llevarRecinto(m)} className="gold-gradient px-8 py-3 rounded-full text-white font-black uppercase text-[9px] tracking-widest shadow-xl">VOTAR AHORA</button>
               )}
            </div>
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

  return (
    <div className="space-y-12">
      <div className="navy-gradient p-20 rounded-[4rem] text-white shadow-2xl text-center border-b-[25px] border-[#D4AF37] relative overflow-hidden group">
        <div className="absolute inset-0 marble-pattern opacity-10 pointer-events-none" />
        <p className="text-[#D4AF37] font-black uppercase text-[12px] tracking-[0.8em] mb-6 font-institutional relative z-10">Tesorería General AA:</p>
        <h2 className="text-[10rem] font-black italic tracking-tighter leading-none relative z-10 group-hover:scale-105 transition-all duration-700">${total.toLocaleString()}</h2>
        <DollarSign size={400} className="absolute -right-20 -bottom-20 text-white/5 rotate-12" />
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6">
        <input type="number" value={m || ''} placeholder="Monto $" onChange={e => setM(Number(e.target.value))} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-black text-4xl text-center outline-none focus:border-[#D4AF37]" />
        <input placeholder="Concepto..." value={d} onChange={e => setD(e.target.value)} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-bold text-xl outline-none focus:border-[#D4AF37]" />
        <button onClick={() => { db.get('finanzas').get(Math.random().toString()).put({monto: m, tipo: 'INGRESO', descripcion: d, fecha: new Date().toLocaleString()}); setM(0); setD(''); }} className="gold-gradient text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Ingreso</button>
        <button onClick={() => { db.get('finanzas').get(Math.random().toString()).put({monto: m, tipo: 'EGRESO', descripcion: d, fecha: new Date().toLocaleString()}); setM(0); setD(''); }} className="bg-rose-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Egreso</button>
      </div>
    </div>
  );
}

function EstatutosView() {
  return (
    <div className="bg-white p-20 rounded-[4rem] shadow-2xl space-y-12 border-t-[15px] border-[#D4AF37]">
      <h3 className="text-5xl font-institutional font-black uppercase border-b-2 pb-6 flex items-center gap-6"><ScrollText size={56} className="text-[#D4AF37]"/> Leyes y Estatutos</h3>
      <div className="space-y-8 text-2xl text-slate-700 italic leading-relaxed font-medium">
        <p className="p-8 bg-slate-50 rounded-[2.5rem] border-l-[15px] border-[#D4AF37]"><strong>Art I:</strong> La soberanía reside en la Lista 001. La Presidencia es la autoridad suprema del recinto.</p>
        <p className="p-8 bg-slate-50 rounded-[2.5rem] border-l-[15px] border-slate-200"><strong>Art II:</strong> La palabra debe ser concedida por el estrado. El silencio es obligatorio durante las mociones.</p>
        <p className="p-8 bg-slate-50 rounded-[2.5rem] border-l-[15px] border-slate-200"><strong>Art III:</strong> Todo legislador debe dar el presente para validar su banca y su voto.</p>
        <p className="p-8 bg-slate-50 rounded-[2.5rem] border-l-[15px] border-slate-200"><strong>Art IV:</strong> Las finanzas son de auditoría pública para todos los miembros del parlamento.</p>
      </div>
    </div>
  );
}

function SecretariasView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      <SecCard title="Actas y Papeles" icon={<FileBox size={50}/>} desc="Gestión de documentos oficiales." />
      <SecCard title="Archivos Históricos" icon={<Archive size={50}/>} desc="Memoria viva de Puerto Esperanza." />
      <SecCard title="Mesa de Entradas" icon={<Send size={50}/>} desc="Recepción de mociones y pedidos." />
    </div>
  );
}

function SecCard({ title, icon, desc }: any) {
  return (
    <div className="bg-white p-14 rounded-[4rem] shadow-2xl text-center space-y-6 border-2 border-slate-50 hover:scale-105 transition-all group">
      <div className="text-[#D4AF37] flex justify-center group-hover:rotate-12 transition-all">{icon}</div>
      <h4 className="text-2xl font-institutional font-black uppercase tracking-tight">{title}</h4>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
      <button className="gold-gradient px-8 py-3 rounded-full text-white font-black uppercase text-[9px] shadow-lg">Abrir Secretaría</button>
    </div>
  );
}

function JuegosView() {
  return (
    <div className="bg-slate-900 p-24 rounded-[5rem] shadow-2xl text-center space-y-10 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 marble-pattern opacity-5 pointer-events-none" />
      <Gamepad2 size={100} className="text-slate-700 animate-pulse" />
      <h3 className="text-5xl font-institutional font-black uppercase text-white tracking-widest">Receso Legislativo</h3>
      <p className="text-xl text-slate-500 italic max-w-xl mx-auto">"Sección de esparcimiento para tiempos de intermedio. Momentos de paz tras la política familiar."</p>
    </div>
  );
}

function AdvisorView() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if(!prompt) return;
    setLoading(true);
    const res = await geminiAssistant.askAdvisor(prompt);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="bg-white p-16 rounded-[4rem] shadow-2xl space-y-10 border-t-[10px] border-[#D4AF37]">
        <h3 className="text-4xl font-institutional font-black uppercase flex items-center gap-6"><BrainCircuit size={48} className="text-[#D4AF37]"/> Asesor Superior</h3>
        <div className="space-y-6">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 font-bold h-32 outline-none focus:border-[#D4AF37] text-xl" placeholder="Consulte al asesor sobre una ley o conflicto familiar..." />
            <button onClick={ask} disabled={loading} className="gold-gradient text-white px-12 py-5 rounded-full font-black uppercase text-[12px] shadow-2xl italic tracking-widest">
                {loading ? 'Consultando al Gran Consejo...' : 'Solicitar Dictamen'}
            </button>
        </div>
        {response && (
            <div className="p-10 bg-[#020617] text-white rounded-[3rem] border-l-[15px] border-[#D4AF37] animate-in italic leading-relaxed text-lg">
                <p className="opacity-80">"{response}"</p>
            </div>
        )}
    </div>
  );
}
