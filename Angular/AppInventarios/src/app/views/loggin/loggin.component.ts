import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loggin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './loggin.component.html',
  styleUrls: ['./loggin.component.css']
})
export class LogginComponent implements OnInit {
  loginForm: FormGroup;
  showMessage = false;
  messageText = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loginForm.valueChanges.subscribe(() => {
      this.showMessage = false;
    });
  }

login() {
  this.loginForm.markAllAsTouched();
  this.loginForm.updateValueAndValidity();

  // Validación robusta usando .invalid directamente
  if (this.loginForm.invalid) {
    this.messageText = 'Ingrese todos los datos';
    this.showMessage = true;
    return;
  }

  const username = this.loginForm.get('username')!.value;
  const password = this.loginForm.get('password')!.value;

  this.authService.login(username, password).subscribe({
    next: () => {
      this.authService.notifyAuthChange();
      this.router.navigate(['/homepage']);
    },
    error: (err) => {
      this.messageText = err.error.message || 'Error al iniciar sesión';
      this.showMessage = true;
    }
  });
}


}
