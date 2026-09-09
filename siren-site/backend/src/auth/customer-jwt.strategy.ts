import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_SECRET') });
  }
  validate(payload: { sub: string; email: string; kind?: string }) {
    if (payload.kind !== 'customer') return false;
    return { id: payload.sub, email: payload.email, kind: payload.kind };
  }
}

@Injectable()
export class CustomerJwtGuard extends AuthGuard('customer-jwt') implements CanActivate {}
