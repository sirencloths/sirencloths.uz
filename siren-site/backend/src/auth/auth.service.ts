import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import { AuditLog, AuthOtp, AuthSession, Customer, CustomerAddress, User, UserRole } from '../database/entities';
import { EmailService } from './email.service';

type OtpPurpose = 'registration' | 'password_reset' | 'password_change';
type CustomerProfile = { firstName: string; lastName: string; phone: string; region: string; address?: string; notificationPreferences?: { blog?: boolean; discounts?: boolean; products?: boolean } };
type SessionKind = 'admin' | 'customer';
type RefreshPayload = { sub: string; email: string | null; role?: UserRole; kind?: 'customer'; sessionId: string; tokenType: 'refresh' };

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(CustomerAddress) private readonly addresses: Repository<CustomerAddress>,
    @InjectRepository(AuthOtp) private readonly otps: Repository<AuthOtp>,
    @InjectRepository(AuthSession) private readonly sessions: Repository<AuthSession>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async onApplicationBootstrap() {
    const total = await this.users.count();
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (total === 0 && email && password) {
      await this.createAdmin(email, password, UserRole.SUPER_ADMIN);
    }
  }

  async login(email: string, password: string) {
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.auditLogs.save(this.auditLogs.create({ actorId: user.id, action: 'logged_in', entityType: 'admin_session', entityId: user.id, payload: { email: user.email } }));
    return { ...(await this.issueAdminSession(user)), user: this.sanitize(user) };
  }

  async refreshAdmin(refreshToken: string) { return this.refreshSession(refreshToken, 'admin'); }
  async logoutAdmin(refreshToken: string) { await this.revokeSession(refreshToken, 'admin'); return { success: true }; }

  async me(id: string) {
    const user = await this.users.findOneByOrFail({ id });
    return this.sanitize(user);
  }

  async createAdmin(email: string, password: string, role: UserRole = UserRole.ADMIN) {
    const exists = await this.users.exists({ where: { email } });
    if (exists) throw new ConflictException('User already exists');
    const user = this.users.create({ email, passwordHash: await bcrypt.hash(password, 12), role });
    return this.users.save(user);
  }

  async beginCustomerEmail(value: string) {
    const email = this.normalizeEmail(value);
    const customer = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email }).getOne();
    if (customer?.passwordHash && customer.isActive) return { next: 'password' as const, email };
    await this.issueOtp(email, 'registration');
    return { next: 'verify_registration' as const, email, expiresInSeconds: 600, resendInSeconds: 60 };
  }

  async verifyCustomerOtp(value: string, code: string, purpose: OtpPurpose) {
    const email = this.normalizeEmail(value);
    const otp = await this.otps.createQueryBuilder('otp').addSelect('otp.codeHash')
      .where('otp.email = :email AND otp.purpose = :purpose AND otp.usedAt IS NULL', { email, purpose })
      .orderBy('otp.createdAt', 'DESC').getOne();
    if (!otp || otp.expiresAt.getTime() < Date.now()) throw new BadRequestException('Verification code has expired');
    if (otp.attempts >= 5) throw new HttpException('Too many verification attempts', HttpStatus.TOO_MANY_REQUESTS);
    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      otp.attempts += 1;
      await this.otps.save(otp);
      throw new UnauthorizedException('Invalid verification code');
    }
    otp.usedAt = new Date();
    await this.otps.save(otp);
    return { verificationToken: await this.jwt.signAsync({ email, purpose, kind: 'customer-verification' }, { expiresIn: '15m' }) };
  }

  async registerCustomer(token: string, profile: CustomerProfile & { password: string }) {
    const payload = await this.verificationPayload(token, 'registration');
    this.validateProfile(profile);
    const existing = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email: payload.email }).getOne();
    if (existing?.passwordHash) throw new ConflictException('An account already exists for this email');
    const passwordHash = await bcrypt.hash(profile.password, 12);
    const customer = existing ?? this.customers.create({ email: payload.email });
    Object.assign(customer, {
      email: payload.email, passwordHash, firstName: profile.firstName.trim(), lastName: profile.lastName.trim(),
      phone: this.normalizePhone(profile.phone), region: profile.region.trim(), emailVerifiedAt: new Date(), lastLoginAt: new Date(),
      registrationSource: 'website', isActive: true, welcomeDiscountEligible: true, welcomeDiscountPercent: 15,
      welcomeDiscountExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const saved = await this.customers.save(customer);
    await this.saveDefaultAddress(saved.id, profile.region, profile.address);
    await this.auditLogs.save(this.auditLogs.create({ actorId: null, action: 'registered', entityType: 'customer', entityId: saved.id, payload: { email: saved.email } }));
    return { ...(await this.issueCustomerSession(saved)), customer: await this.customerMe(saved.id) };
  }

  async customerLogin(value: string, password: string) {
    const email = this.normalizeEmail(value);
    const customer = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email }).getOne();
    if (!customer?.passwordHash || !customer.isActive || !(await bcrypt.compare(password, customer.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    customer.lastLoginAt = new Date();
    await this.customers.save(customer);
    await this.auditLogs.save(this.auditLogs.create({ actorId: null, action: 'logged_in', entityType: 'customer', entityId: customer.id, payload: { email: customer.email } }));
    return { ...(await this.issueCustomerSession(customer)), customer: await this.customerMe(customer.id) };
  }

  async beginPasswordReset(value: string, purpose: OtpPurpose = 'password_reset') {
    const email = this.normalizeEmail(value);
    const customer = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email }).getOne();
    // A generic successful response prevents an unauthorised caller from using this endpoint for enumeration.
    if (!customer?.passwordHash || !customer.isActive) return { accepted: true, expiresInSeconds: 600, resendInSeconds: 60 };
    await this.issueOtp(email, purpose);
    return { accepted: true, expiresInSeconds: 600, resendInSeconds: 60 };
  }

  async resetCustomerPassword(token: string, password: string) {
    if (password.length < 8) throw new BadRequestException('Password must contain at least 8 characters');
    const payload = await this.verificationPayload(token, 'password_reset');
    const customer = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email: payload.email }).getOne();
    if (!customer) throw new BadRequestException('Account not found');
    customer.passwordHash = await bcrypt.hash(password, 12);
    customer.lastLoginAt = new Date();
    await this.customers.save(customer);
    await this.sessions.update({ customerId: customer.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    return { ...(await this.issueCustomerSession(customer)), customer: await this.customerMe(customer.id) };
  }

  async refreshCustomer(refreshToken: string) { return this.refreshSession(refreshToken, 'customer'); }
  async logoutCustomer(refreshToken: string) { await this.revokeSession(refreshToken, 'customer'); return { success: true }; }

  async customerMe(id: string) {
    const customer = await this.customers.findOneByOrFail({ id });
    if (customer.welcomeDiscountEligible && !customer.welcomeDiscountUsedAt && this.welcomeDiscountExpiresAt(customer) <= new Date()) {
      customer.welcomeDiscountEligible = false;
      await this.customers.save(customer);
    }
    const address = await this.addresses.findOne({ where: { customerId: id, isDefault: true }, order: { updatedAt: 'DESC' } });
    return { ...this.sanitizeCustomer(customer), welcomeDiscountExpiresAt: customer.welcomeDiscountEligible ? this.welcomeDiscountExpiresAt(customer) : null, address: address?.line1 ?? '', region: customer.region ?? address?.city ?? '' };
  }

  async updateCustomer(id: string, profile: Partial<CustomerProfile>) {
    const customer = await this.customers.findOneByOrFail({ id });
    if (profile.firstName !== undefined) customer.firstName = profile.firstName.trim();
    if (profile.lastName !== undefined) customer.lastName = profile.lastName.trim();
    if (profile.phone !== undefined) customer.phone = this.normalizePhone(profile.phone);
    if (profile.region !== undefined) customer.region = profile.region.trim();
    if (profile.notificationPreferences !== undefined) {
      customer.metadata = {
        ...(customer.metadata ?? {}),
        notificationPreferences: {
          blog: Boolean(profile.notificationPreferences.blog),
          discounts: Boolean(profile.notificationPreferences.discounts),
          products: Boolean(profile.notificationPreferences.products),
        },
      };
    }
    await this.customers.save(customer);
    if (profile.address !== undefined || profile.region !== undefined) await this.saveDefaultAddress(customer.id, customer.region ?? '', profile.address);
    return this.customerMe(id);
  }

  async customerIdFromToken(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; kind?: string }>(token);
      return payload.kind === 'customer' ? payload.sub : null;
    } catch { return null; }
  }

  private async issueOtp(email: string, purpose: OtpPurpose) {
    const latest = await this.otps.findOne({ where: { email, purpose, usedAt: IsNull() }, order: { createdAt: 'DESC' } });
    if (latest && latest.resendAvailableAt.getTime() > Date.now()) throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = new Date();
    // Delivery happens before invalidating the previous code so a missing SMTP
    // configuration never leaves the customer with an unreachable new code.
    await this.email.sendVerificationCode(email, code);
    await this.otps.createQueryBuilder().update().set({ usedAt: new Date() }).where('email = :email AND purpose = :purpose AND used_at IS NULL', { email, purpose }).execute();
    await this.otps.save(this.otps.create({ email, purpose, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(now.getTime() + 10 * 60_000), resendAvailableAt: new Date(now.getTime() + 60_000), attempts: 0 }));
  }

  private async verificationPayload(token: string, purpose: OtpPurpose) {
    try {
      const payload = await this.jwt.verifyAsync<{ email: string; purpose: OtpPurpose; kind: string }>(token);
      if (payload.kind !== 'customer-verification' || payload.purpose !== purpose) throw new Error('bad token');
      return payload;
    } catch { throw new UnauthorizedException('Verification has expired. Request a new code.'); }
  }

  private async issueAdminSession(user: User) {
    return this.issueSession('admin', user.id, user.email, user.role);
  }

  private async issueCustomerSession(customer: Customer) {
    return this.issueSession('customer', customer.id, customer.email);
  }

  private async issueSession(kind: SessionKind, subjectId: string, email: string | null, role?: UserRole) {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const session = await this.sessions.save(this.sessions.create({
      userId: kind === 'admin' ? subjectId : null,
      customerId: kind === 'customer' ? subjectId : null,
      kind,
      // It is replaced immediately below after the signed token is created.
      tokenHash: 'pending',
      expiresAt,
      revokedAt: null,
    }));
    const accessToken = await this.signAccessToken(kind, subjectId, email, role);
    const refreshToken = await this.jwt.signAsync(
      kind === 'admin'
        ? { sub: subjectId, email, role, sessionId: session.id, tokenType: 'refresh' }
        : { sub: subjectId, email, kind: 'customer', sessionId: session.id, tokenType: 'refresh' },
      { secret: this.refreshSecret(), expiresIn: '30d' },
    );
    session.tokenHash = await bcrypt.hash(refreshToken, 12);
    await this.sessions.save(session);
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  private async refreshSession(refreshToken: string, kind: SessionKind) {
    const payload = await this.readRefreshPayload(refreshToken, kind);
    const session = await this.sessions.createQueryBuilder('session')
      .addSelect('session.tokenHash')
      .where('session.id = :id AND session.kind = :kind', { id: payload.sessionId, kind })
      .getOne();
    const sessionOwnerId = kind === 'admin' ? session?.userId : session?.customerId;
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || sessionOwnerId !== payload.sub || !(await bcrypt.compare(refreshToken, session.tokenHash))) {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }

    if (kind === 'admin') {
      const user = await this.users.findOneBy({ id: payload.sub });
      if (!user?.isActive) throw new UnauthorizedException('Account is unavailable');
      return this.refreshResult('admin', user.id, user.email, refreshToken, session.expiresAt, user.role);
    }
    const customer = await this.customers.findOneBy({ id: payload.sub });
    if (!customer?.isActive) throw new UnauthorizedException('Account is unavailable');
    return this.refreshResult('customer', customer.id, customer.email, refreshToken, session.expiresAt);
  }

  private async refreshResult(kind: SessionKind, subjectId: string, email: string | null, refreshToken: string, expiresAt: Date, role?: UserRole) {
    return {
      accessToken: await this.signAccessToken(kind, subjectId, email, role),
      // The refresh token stays valid for its original 30-day session.  This
      // avoids a browser reload interrupting a rotation response and leaving
      // the client with a revoked token.
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    };
  }

  private signAccessToken(kind: SessionKind, subjectId: string, email: string | null, role?: UserRole) {
    return this.jwt.signAsync(
      kind === 'admin'
        ? { sub: subjectId, email, role, tokenType: 'access' }
        : { sub: subjectId, email, kind: 'customer', tokenType: 'access' },
      { expiresIn: '1h' },
    );
  }

  private async revokeSession(refreshToken: string, kind: SessionKind) {
    try {
      const payload = await this.readRefreshPayload(refreshToken, kind);
      await this.sessions.update({ id: payload.sessionId, kind }, { revokedAt: new Date() });
    } catch {
      // Sign-out is idempotent.  Clients clear their local session even when a
      // refresh token has already expired or was rotated in another tab.
    }
  }

  private async readRefreshPayload(token: string, kind: SessionKind): Promise<RefreshPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(token, { secret: this.refreshSecret() });
      const isExpectedKind = kind === 'admin' ? !payload.kind : payload.kind === 'customer';
      if (payload.tokenType !== 'refresh' || !payload.sessionId || !isExpectedKind) throw new Error('Unexpected token');
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }
  }

  private refreshSecret() { return this.config.get<string>('JWT_REFRESH_SECRET') || this.config.getOrThrow<string>('JWT_SECRET'); }

  private welcomeDiscountExpiresAt(customer: Customer) {
    // Existing accounts created before this field was introduced get a
    // deterministic expiry from their registration timestamp, never a new 24h window.
    return customer.welcomeDiscountExpiresAt ?? new Date(customer.createdAt.getTime() + 24 * 60 * 60 * 1000);
  }
  private normalizeEmail(value: string) {
    const email = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address');
    return email;
  }
  private normalizePhone(value: string) {
    const phone = value.trim().replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(phone)) throw new BadRequestException('Enter a valid phone number');
    return phone.startsWith('+') ? phone : `+${phone}`;
  }
  private validateProfile(profile: CustomerProfile & { password: string }) {
    if (!profile.firstName?.trim() || !profile.lastName?.trim() || !profile.region?.trim()) throw new BadRequestException('Complete all required profile fields');
    if (!profile.password || profile.password.length < 8) throw new BadRequestException('Password must contain at least 8 characters');
    this.normalizePhone(profile.phone);
  }
  private async saveDefaultAddress(customerId: string, region: string, address?: string) {
    if (address === undefined && !region) return;
    let item = await this.addresses.findOne({ where: { customerId, isDefault: true } });
    if (!item) item = this.addresses.create({ customerId, isDefault: true, country: 'Uzbekistan', city: region, line1: address?.trim() ?? '' });
    else { if (region) item.city = region; if (address !== undefined) item.line1 = address.trim(); }
    await this.addresses.save(item);
  }
  private sanitizeCustomer(customer: Customer) {
    const { passwordHash: _passwordHash, ...safe } = customer;
    return safe;
  }

  private sanitize(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
