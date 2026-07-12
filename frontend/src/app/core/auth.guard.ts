import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasToken()) {
    if (auth.user()) {
      return true;
    }
    try {
      await auth.loadProfile();
      return true;
    } catch {
      auth.logout();
    }
  }

  return router.createUrlTree(['/login']);
};

