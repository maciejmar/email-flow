import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="shell">
      <main class="app-layer">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    if (this.auth.hasToken()) {
      void this.auth.loadProfile().catch(() => this.router.navigateByUrl('/login'));
    }
  }
}
