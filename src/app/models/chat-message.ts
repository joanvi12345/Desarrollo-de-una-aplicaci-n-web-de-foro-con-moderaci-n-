export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number; // Date.now()
  self?: boolean;    // útil para estilos del propio usuario
}
