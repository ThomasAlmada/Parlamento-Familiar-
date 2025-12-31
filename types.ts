
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
  foto?: string;
  confirmado: boolean; 
  presente: boolean;
  votoActual: VoteType;
  pedirPalabra: 'NINGUNO' | 'ESPERA' | 'CONCEDIDA' | 'RECHAZADA';
  activo: boolean;
  banca: number;
  password?: string;
}

export interface VotoGuardado {
  id: string;
  asunto: string;
  fecha: string;
  resultado: 'APROBADA' | 'RECHAZADA';
  totalSi: number;
  totalNo: number;
  totalAbstencion: number;
  textoDetalle: string; // Formato pedido: "Persona A: Afirmativo, Persona B: ..."
}

export interface Acta {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string;
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

export interface AppState {
  users: User[];
  mociones: Moción[];
  finanzas: MovimientoFinanciero[];
  votosHistorial: VotoGuardado[];
  actas: Acta[];
  activeVote: { activa: boolean, asunto: string, idMocion?: string } | null;
  sessionStatus: SessionStatus;
  speakerId: string | null;
  proyeccion: {
    tipo: 'NADA' | 'HIMNO' | 'HOMENAJE' | 'RESULTADO' | 'LIMPIAR';
    titulo?: string;
    subtitulo?: string;
  };
  sessionStartTime: string | null;
}
