import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ChatMessage } from '../models/chat-message';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private broadcast$ = new Subject<ChatMessage>();
  
  // URL de tu servidor Spring Boot
  private apiUrl = 'http://localhost:8080/api/chat/send';

  constructor(private http: HttpClient) {
    // Escuchamos el canal de broadcast para actualizar la lista de mensajes
    this.broadcast$.subscribe((msg: ChatMessage) => {
      const current = this.messages$.value;
      this.messages$.next([...current, msg]);
    });

    // Mensaje de bienvenida inicial (Mock local)
    this.addSystemMessage('¡Bienvenido al foro moderado por Java! 🚀');
  }

  stream(): Observable<ChatMessage[]> {
    return this.messages$.asObservable();
  }

  send(user: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. Mostramos el mensaje del usuario inmediatamente en la UI
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user,
      text: trimmed,
      timestamp: Date.now()
    };
    this.broadcast$.next(userMsg);

    // 2. Enviamos al Backend de Spring Boot
    // Esperamos un objeto { reply: string }
    this.http.post<{reply: string}>(this.apiUrl, { text: trimmed }).subscribe({
      next: (res) => {
        if (res.reply) {
          this.addSystemMessage(res.reply, 'java-backend-bot');
        }
      },
      error: (err) => {
        console.error('Error conectando con Spring Boot:', err);
        this.addSystemMessage('⚠️ Error: No se pudo contactar con el servidor Java.', 'system-error');
      }
    });
  }

  private addSystemMessage(text: string, user: string = 'moderator-bot') {
    this.broadcast$.next({
      id: crypto.randomUUID(),
      user,
      text,
      timestamp: Date.now()
    });
  }
}
  // ==== Cómo conectar un WebSocket real más adelante ====
  // 1) Reemplaza broadcast$ por un WebSocket:
  //
  //  private socket = new WebSocket('wss://TU_HOST/chat');
  //  constructor() {
  //    this.socket.onmessage = (event) => {
  //      const msg = JSON.parse(event.data) as ChatMessage;
  //      this.messages$.next([...this.messages$.value, msg]);
  //    };
  //  }
  //  send(user: string, text: string) {
  //    this.socket.send(JSON.stringify({ user, text }));
  //  }
  //
  // 2) Ajusta el esquema a tu backend NestJS (gateway WS) cuando lo tengas.

