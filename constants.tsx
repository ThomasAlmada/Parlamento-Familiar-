
import { Role, User } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-almada',
    dni: '49993070',
    nombre: 'ALMADA',
    apellido: 'AQUINO',
    cargo: Role.PRESIDENTE,
    curso: 'ALMADA-AQUINO',
    confirmado: true,
    presente: true,
    votoActual: null,
    pedirPalabra: 'NINGUNO',
    activo: true,
    banca: 0,
    password: '49993070'
  }
];
