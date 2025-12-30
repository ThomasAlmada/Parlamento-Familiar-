
export enum Role {
  PRESIDENTE = 'Presidente del Parlamento',
  VICEPRESIDENTE_1 = 'Vicepresidente Primero',
  VICEPRESIDENTE_2 = 'Vicepresidente Segundo',
  SECRETARIO = 'Secretario Parlamentario',
  ADMIN = 'Administrador General',
  DIPUTADO_FAMILIAR = 'Diputado Familiar',
  USUARIO = 'Integrante',
  VISITANTE = 'Invitado'
}

export type VoteType = 'YES' | 'NO' | 'ABSTAIN' | null;
export type SessionStatus = 'ACTIVA' | 'CERRADA' | 'CUARTO_INTERMEDIO';

export interface User {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  cargo: Role;
  curso: string;
  foto?: string; // Base64
  confirmado: boolean; 
  votoActual: VoteType;
  pedirPalabra: 'NINGUNO' | 'ESPERA' | 'CONCEDIDA' | 'RECHAZADA';
  activo: boolean;
  banca: number; // 0 a 37
  password?: string; // Para la credencial
}

export interface Moción {
  id: string;
  titulo: string;
  descripcion: string;
  proponenteNombre: string;
  proponenteId: string;
  estado: 'PENDIENTE' | 'RECINTO' | 'RECHAZADA' | 'ARCHIVADA' | 'APROBADA';
  fecha: string;
}

export interface MovimientoFinanciero {
  id: string;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  descripcion: string;
  fecha: string;
}

export interface Sancion {
  id: string;
  userId: string;
  userName: string;
  motivo: string;
  gravedad: 'LEVE' | 'MEDIA' | 'GRAVE';
  fecha: string;
}

export interface NewsItem {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string;
  imagen?: string;
}

export interface VoteSession {
  activa: boolean;
  asunto: string;
  inicio: string;
}

export interface AppState {
  users: User[];
  mociones: Moción[];
  finanzas: MovimientoFinanciero[];
  sanciones: Sancion[];
  noticias: NewsItem[];
  activeVote: VoteSession | null;
  sessionStatus: SessionStatus;
  speakerId: string | null;
  sessionStartTime: string | null;
  waitingList: string[];
  intermissionTimer: number | null;
}
