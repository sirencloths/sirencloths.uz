import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import { AuthOtp, Customer, CustomerAddress, User, UserRole } from '../database/entities';
import { EmailService } from './email.service';

type OtpPurpose = 'registration' | 'password_reset' | 'password_change';
type CustomerProfile = { firstName: string; lastName: string; phone: string; region: string; address?: string };

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(CustomerAddress) private readonly addresses: Repository<CustomerAddress>,
    @InjectRepository(AuthOtp) private readonly otps: Repository<AuthOtp>,
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
    return { accessToken: await this.sign(user), user: this.sanitize(user) };
  }

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
    });
    const saved = await this.customers.save(customer);
    await this.saveDefaultAddress(saved.id, profile.region, profile.address);
    return { accessToken: await this.signCustomer(saved), customer: await this.customerMe(saved.id) };
  }

  async customerLogin(value: string, password: string) {
    const email = this.normalizeEmail(value);
    const customer = await this.customers.createQueryBuilder('customer').addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email }).getOne();
    if (!customer?.passwordHash || !customer.isActive || !(await bcrypt.compare(password, customer.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    customer.lastLoginAt = new Date();
    await this.customers.save(customer);
    return { accessToken: await this.signCustomer(customer), customer: await this.customerMe(customer.id) };
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
    return { accessToken: await this.signCustomer(customer), customer: await this.customerMe(customer.id) };
  }

  async customerMe(id: string) {
    const customer = await this.customers.findOneByOrFail({ id });
    const address = await this.addresses.findOne({ where: { customerId: id, isDefault: true }, order: { updatedAt: 'DESC' } });
    return { ...this.sanitizeCustomer(customer), address: address?.line1 ?? '', region: customer.region ?? address?.city ?? '' };
  }

  async updateCustomer(id: string, profile: Partial<CustomerProfile>) {
    const customer = await this.customers.findOneByOrFail({ id });
    if (profile.firstName !== undefined) customer.firstName = profile.firstName.trim();
    if (profile.lastName !== undefined) customer.lastName = profile.lastName.trim();
    if (profile.phone !== undefined) customer.phone = this.normalizePhone(profile.phone);
    if (profile.region !== undefined) customer.region = profile.region.trim();
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

  private signCustomer(customer: Customer) { return this.jwt.signAsync({ sub: customer.id, email: customer.email, kind: 'customer' }, { expiresIn: '12h' }); }
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

  private sign(user: User) {
    return this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
  }

  private sanitize(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
