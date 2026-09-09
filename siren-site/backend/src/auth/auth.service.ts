import { ConflictException, Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User, UserRole } from '../database/entities';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

  private sign(user: User) {
    return this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
  }

  private sanitize(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
