import { computed, Injectable, signal } from '@angular/core';

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface RegisteredUser {
  login: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  private registeredUsers = signal<RegisteredUser[]>([
    { login: '1', password: '1', name: 'Admin', role: 'admin' },
  ]);

  login(login: string, password: string): boolean {
    const found = this.registeredUsers().find(
      u => u.login === login && u.password === password
    );
    if (!found) return false;
    this.user.set({ email: found.login, name: found.name, role: found.role });
    return true;
  }

  registerUser(login: string, password: string, name: string): boolean {
    if (this.registeredUsers().some(u => u.login === login)) return false;
    this.registeredUsers.update(list => [...list, { login, password, name, role: 'user' }]);
    this.user.set({ email: login, name, role: 'user' });
    return true;
  }

  logout(): void {
    this.user.set(null);
  }
}
