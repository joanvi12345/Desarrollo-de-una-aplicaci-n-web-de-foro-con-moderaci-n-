import { Component, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './services/chat.service';
import { ChatMessage } from './models/chat-message';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
  <div class="page">
    <header class="topbar">
      <div class="brand">
        <span class="logo">💬</span>
        <h1>Foro ML/NLP — Chat</h1>
      </div>
      <div class="userbox">
        <input
          [ngModel]="username()"
          (ngModelChange)="username.set($event)"
          (keyup.enter)="focusInput()"
          placeholder="Tu nombre"
          maxlength="24"/>
        <button (click)="saveName()">Guardar</button>
      </div>
    </header>

    <main class="chat-card">
      <div #scrollRef class="messages" (scroll)="onScroll()">
        <ng-container *ngFor="let m of viewMessages(); trackBy: trackById">
          <div class="msg" [class.self]="m.self">
            <div class="meta">
              <span class="user">{{ m.user }}</span>
              <span class="time">{{ m.timestamp | date:'HH:mm' }}</span>
            </div>
            <div class="bubble">{{ m.text }}</div>
          </div>
        </ng-container>
      </div>

      <form class="composer" (submit)="onSubmit($event)">
        <textarea #inputRef
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          name="draft"
          rows="1"
          placeholder="Escribe un mensaje…"
          (input)="autoGrow(inputRef)"
          (keydown.enter)="maybeSend($event)">
        </textarea>
        <button type="submit" [disabled]="!canSend()">Enviar</button>
      </form>
    </main>
  </div>
  `,
  styles: [`
  :host, .page { display: block; height: 100dvh; background: #0b1020; color: #e8ecf1; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #1b2545; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand .logo { font-size:22px; }
  h1 { font-size:16px; margin:0; font-weight:600; letter-spacing:.2px; }
  .userbox { display:flex; gap:8px; }
  .userbox input { background:#0f1730; border:1px solid #243158; color:#e8ecf1; padding:6px 10px; border-radius:10px; min-width:160px; }
  .userbox button { background:#3b82f6; border:none; padding:6px 12px; border-radius:10px; color:white; cursor:pointer; }
  .userbox button:disabled { opacity:.6; cursor:default; }

  .chat-card { max-width:900px; margin:16px auto; background:#0f1730; border:1px solid #1b2545; border-radius:16px; display:flex; flex-direction:column; height: calc(100dvh - 90px); }
  .messages { padding:16px; overflow:auto; flex:1; display:flex; flex-direction:column; gap:12px; }
  .msg { max-width:70%; display:flex; flex-direction:column; gap:4px; }
  .msg.self { margin-left:auto; align-items:flex-end; }
  .meta { font-size:11px; color:#9fb3d9; display:flex; gap:8px; }
  .meta .user { font-weight:600; color:#b9cdf3; }
  .bubble { background:#122044; border:1px solid #1c2a55; padding:10px 12px; border-radius:14px; white-space:pre-wrap; word-break:break-word; }
  .self .bubble { background:#1b3a7a; border-color:#244a98; }
  .composer { display:flex; gap:10px; border-top:1px solid #1b2545; padding:12px; }
  textarea { flex:1; resize:none; max-height:160px; min-height:38px; background:#0b162f; border:1px solid #20305b; border-radius:12px; color:#e8ecf1; padding:10px 12px; }
  button[type=submit] { background:#22c55e; border:none; padding:10px 14px; border-radius:12px; color:#0a111f; font-weight:700; cursor:pointer; }
  button[disabled] { opacity:.6; cursor:default; }
  `]
})
export class AppComponent {
  @ViewChild('scrollRef') private scrollRef?: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef')  private inputRef?: ElementRef<HTMLTextAreaElement>;

  private svc = inject(ChatService);

  username = signal<string>(localStorage.getItem('chat.username') || 'user-' + Math.floor(Math.random()*1000));
  draft = signal<string>('');
  messages = signal<ChatMessage[]>([]);
  autoStick = true;

  constructor() {
    this.svc.stream().subscribe((list: ChatMessage[]) => {
      const withSelf = list.map((m: ChatMessage) => ({ ...m, self: m.user === this.username() }));
      this.messages.set(withSelf);
      queueMicrotask(() => this.stickToBottom());
    });
  }

  viewMessages = computed(() => this.messages());

  trackById(_: number, m: ChatMessage) { return m.id; }

  saveName() {
    const v = this.username().trim();
    if (!v) return;
    localStorage.setItem('chat.username', v);
  }

  canSend(): boolean {
    return this.draft().trim().length > 0;
  }

  // Recibe Event y casteamos dentro (ev en template siempre es Event)
  maybeSend(ev: Event) {
    const e = ev as KeyboardEvent;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  onSubmit(ev: Event) {
    ev.preventDefault();
    this.send();
  }

  send() {
    const text = this.draft();
    if (!text.trim()) return;
    this.svc.send(this.username(), text);
    this.draft.set('');
    this.resizeComposer();
    this.focusInput();
  }

  autoGrow(el: HTMLTextAreaElement) {
    this.resizeComposer(el);
  }

  resizeComposer(el?: HTMLTextAreaElement) {
    const area = el ?? this.inputRef?.nativeElement;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = Math.min(area.scrollHeight, 160) + 'px';
  }

  focusInput() { this.inputRef?.nativeElement?.focus(); }

  onScroll() {
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    this.autoStick = nearBottom;
  }

  private stickToBottom() {
    if (!this.autoStick) return;
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
