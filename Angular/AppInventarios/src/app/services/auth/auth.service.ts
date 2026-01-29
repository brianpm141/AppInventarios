import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environment';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {

  private apiUrl = `${environment.apiUrl}/api/auth`;
  private tokenKey = 'auth-token';
  private authUserKey = 'auth-user';
  private reloadKey = 'auth-reload-state';

  private authStatus = new BehaviorSubject<boolean>(this.isLoggedIn());
  authStatus$ = this.authStatus.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.initializeSessionPersistence();
    window.addEventListener('beforeunload', this.setReloadFlag.bind(this));
  }

  // Persistencia de sesión
  private initializeSessionPersistence() {
    const isReloading = sessionStorage.getItem(this.reloadKey) === 'true';
    if (isReloading) {
      sessionStorage.removeItem(this.reloadKey);
    } else {
      this.clearAuthData();
      this.notifyAuthChange();
    }
  }

  private setReloadFlag() {
    if (this.isLoggedIn()) {
      sessionStorage.setItem(this.reloadKey, 'true');
    }
  }

  // Iniciar sesión
  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.authUserKey, JSON.stringify({
          id: response.id,
          username: response.username,
          role: response.role
        }));
        this.notifyAuthChange();
      })
    );
  }

  // Cerrar sesión
  logout() {
    this.clearAuthData();
    this.notifyAuthChange();
    this.router.navigate(['/login']);
  }

  private clearAuthData() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.authUserKey);
    sessionStorage.removeItem(this.reloadKey);
  }

  notifyAuthChange() {
    this.authStatus.next(this.isLoggedIn());
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUser(): { id: number, username: string, role: number } | null {
    const user = localStorage.getItem(this.authUserKey);
    return user ? JSON.parse(user) : null;
  }

  // ✅ Getter del rol del usuario actual
  get userRole(): number {
    return this.getUser()?.role ?? 2; // Devuelve 2 (Usuario) si no hay sesión
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.setReloadFlag.bind(this));
  }
}
