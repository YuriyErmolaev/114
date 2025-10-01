import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly userKey = 'app.user_uid';
  private readonly sessionKey = 'app.session_id';
  private readonly demoUid = 'e43a913f-059f-45f9-9962-ffafdf536e28';

  getUserUid(): string {
    let uid = localStorage.getItem(this.userKey);
    if (uid !== this.demoUid) {
      uid = this.demoUid; // enforce demo uid
      localStorage.setItem(this.userKey, uid);
    }
    return uid;
  }

  getSessionId(): string {
    const uid = this.getUserUid();
    let sid = localStorage.getItem(this.sessionKey);
    if (sid !== uid) {
      sid = uid; // session follows demo uid
      localStorage.setItem(this.sessionKey, sid);
    }
    return sid;
  }


  /** Set new user and immediately sync session to it */
  setUserUid(uid: string): void {
    if (!uid) return;
    localStorage.setItem(this.userKey, uid);
    localStorage.setItem(this.sessionKey, uid);
  }

  /** Ensure session is aligned with current user (idempotent) */
  syncSessionToCurrentUser(): void {
    const uid = this.getUserUid();
    const sid = localStorage.getItem(this.sessionKey);
    if (sid !== uid) localStorage.setItem(this.sessionKey, uid);
  }

  isAdmin(): boolean {
    return true;
  }
}
