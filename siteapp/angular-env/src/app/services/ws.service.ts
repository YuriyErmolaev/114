import {inject, Injectable} from '@angular/core';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

type MessageHandler = (data: any) => void;

@Injectable({ providedIn: 'root' })
export class WsService {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private authorized = false;


  constructor(private auth: AuthService) {}

  connect(): void {
    const token = this.auth.getToken();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;


    if (!token) return;

    this.socket = new WebSocket(`/ws?token=${token}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.authorized = false;

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === 'connection_ack') {
          this.authorized = true;
          console.log(`Authorized as ${parsed.user}`);
        }

        this.handlers.forEach((fn) => fn(parsed));
      } catch {}
    };

    this.socket.onerror = () => {
      console.error('WebSocket error');
    };
  }

  send(data: any): void {
    // if (this.socket && this.socket.readyState === WebSocket.OPEN) {
    //   this.socket.send(JSON.stringify(data));
    // }

    console.log('Send ws begin');

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.authorized) {
      this.socket.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
    this.handlers = [];
  }
}
