import { Global, Module } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard } from './csrf.guard.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard, CsrfGuard],
  exports: [AuthService, AdminAuthGuard, CsrfGuard],
})
export class AuthModule {}
