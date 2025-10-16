// src/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as firebaseAdmin from 'firebase-admin';
import { ROLES_KEY } from 'src/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) throw new ForbiddenException('Token manquant');

    const token = authHeader.replace('Bearer ', '');
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);

    // 🔑 Aller chercher le rôle depuis Firestore
    const userRef = firebaseAdmin.firestore().collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new ForbiddenException('Utilisateur introuvable');

    const userRole = userDoc.data()?.role;
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Accès refusé : rôle non autorisé');
    }

    request.user = { uid: decoded.uid, role: userRole };
    return true;
  }
}