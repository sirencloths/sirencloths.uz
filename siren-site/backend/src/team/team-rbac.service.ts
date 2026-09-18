import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { AdminRole, AuthSession, Employee, EmployeeInvitation, EmployeeRole, EmployeeTeam, EmploymentStatus, EmploymentType, Permission, PermissionScope, RolePermission, Team, User, UserRole } from '../database/entities';

type Actor = { id: string; role: UserRole };
type PermissionSeed = { key: string; module: string; label: string; sensitive?: boolean };
const PERMISSIONS: PermissionSeed[] = [
  ['dashboard.view', 'dashboard', 'Dashboardni ko‘rish'], ['products.view', 'products', 'Mahsulotlarni ko‘rish'], ['products.create', 'products', 'Mahsulot yaratish'], ['products.edit', 'products', 'Mahsulot tahrirlash'], ['products.delete', 'products', 'Mahsulot o‘chirish'], ['products.publish', 'products', 'Mahsulot nashr qilish'],
  ['inventory.view', 'inventory', 'Omborni ko‘rish'], ['inventory.edit', 'inventory', 'Omborni tahrirlash'], ['inventory.transfer', 'inventory', 'Transfer qilish'], ['inventory.adjust', 'inventory', 'Qoldiqni tuzatish'],
  ['orders.view', 'orders', 'Buyurtmalarni ko‘rish'], ['orders.edit', 'orders', 'Buyurtma tahrirlash'], ['orders.cancel', 'orders', 'Buyurtmani bekor qilish'], ['orders.refund', 'orders', 'Refund qilish', true], ['orders.export', 'orders', 'Buyurtmalarni eksport qilish'],
  ['customers.view', 'customers', 'Mijozlarni ko‘rish'], ['customers.edit', 'customers', 'Mijozni tahrirlash'], ['customers.delete', 'customers', 'Mijozni o‘chirish'], ['customers.export', 'customers', 'Mijozlarni eksport qilish', true],
  ['analytics.view', 'analytics', 'Analitikani ko‘rish'], ['analytics.export', 'analytics', 'Analitikani eksport qilish'], ['finance.view', 'finance', 'Moliyani ko‘rish', true], ['finance.edit', 'finance', 'Moliyani tahrirlash', true], ['finance.export', 'finance', 'Moliyani eksport qilish', true],
  ['team.view', 'team', 'Jamoalarni ko‘rish'], ['team.create', 'team', 'Jamoa yaratish'], ['team.edit', 'team', 'Jamoa tahrirlash'], ['team.delete', 'team', 'Jamoa o‘chirish'], ['employees.view', 'employees', 'Xodimlarni ko‘rish'], ['employees.create', 'employees', 'Xodim yaratish'], ['employees.edit', 'employees', 'Xodim tahrirlash'], ['employees.deactivate', 'employees', 'Xodimni faolsizlantirish'], ['employees.personal_data.view', 'employees', 'Shaxsiy HR ma’lumotlarini ko‘rish', true],
  ['roles.view', 'roles', 'Rollarni ko‘rish'], ['roles.create', 'roles', 'Rol yaratish'], ['roles.edit', 'roles', 'Rol tahrirlash'], ['roles.delete', 'roles', 'Rol o‘chirish', true], ['roles.assign', 'roles', 'Rol biriktirish', true], ['permissions.view', 'permissions', 'Huquqlarni ko‘rish'], ['permissions.assign', 'permissions', 'Huquqlarni biriktirish', true], ['audit.view', 'audit', 'Audit tarixini ko‘rish', true], ['settings.view', 'settings', 'Sozlamalarni ko‘rish'], ['settings.edit', 'settings', 'Sozlamalarni tahrirlash', true], ['security.view', 'security', 'Xavfsizlikni ko‘rish', true], ['security.edit', 'security', 'Xavfsizlikni tahrirlash', true],
].map(([key, module, label, sensitive]) => ({ key: key as string, module: module as string, label: label as string, sensitive: Boolean(sensitive) }));
const ADMIN_DEFAULT = new Set(PERMISSIONS.filter((item) => !item.key.startsWith('security.') && !item.key.startsWith('settings.') && item.key !== 'audit.view' && item.key !== 'permissions.assign' && item.key !== 'roles.delete').map((item) => item.key));

@Injectable()
export class TeamRbacService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(EmployeeTeam) private readonly employeeTeams: Repository<EmployeeTeam>,
    @InjectRepository(AdminRole) private readonly roles: Repository<AdminRole>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(EmployeeRole) private readonly employeeRoles: Repository<EmployeeRole>,
    @InjectRepository(EmployeeInvitation) private readonly invitations: Repository<EmployeeInvitation>,
    @InjectRepository(AuthSession) private readonly sessions: Repository<AuthSession>,
  ) {}

  async onModuleInit() { await this.bootstrap(); }
  private async nextId(sequence: string, prefix: string) {
    try { const [row] = await this.dataSource.query(`SELECT nextval('${sequence}') AS value`); return `${prefix}-${String(Number(row.value)).padStart(6, '0')}`; }
    // In-memory test databases do not run production migrations. Production
    // always uses the sequence above; this keeps isolated tests bootable.
    catch { return `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }
  }
  private async bootstrap() {
    for (const item of PERMISSIONS) await this.permissions.upsert({ key: item.key, module: item.module, label: item.label, isSensitive: item.sensitive, defaultScope: PermissionScope.ALL }, ['key']);
    for (const [name, description] of [['SUPER ADMIN', 'Tizimning himoyalangan eng yuqori roli'], ['ADMIN', 'Tizimning himoyalangan administrator roli']]) {
      if (!await this.roles.exists({ where: { name } })) await this.roles.save(this.roles.create({ roleId: await this.nextId('role_internal_id_seq', 'ROLE'), name, description, isSystem: true, isProtected: true, color: name === 'SUPER ADMIN' ? '#7f56d9' : '#465fff' }));
    }
    const [allPermissions, systemRoles] = await Promise.all([
      this.permissions.find(),
      this.roles.findBy({ name: In(['SUPER ADMIN', 'ADMIN']) }),
    ]);
    const permissionsByKey = new Map(allPermissions.map((permission) => [permission.key, permission]));
    for (const role of systemRoles) {
      const allowed = role.name === 'SUPER ADMIN' ? allPermissions : [...ADMIN_DEFAULT].map((key) => permissionsByKey.get(key)).filter((permission): permission is Permission => Boolean(permission));
      const existing = await this.rolePermissions.findBy({ roleId: role.id });
      const linked = new Set(existing.map((link) => link.permissionId));
      const missing = allowed.filter((permission) => !linked.has(permission.id));
      if (missing.length) await this.rolePermissions.save(missing.map((permission) => this.rolePermissions.create({ roleId: role.id, permissionId: permission.id, scope: PermissionScope.ALL })));
    }
    const roleByName = new Map(systemRoles.map((role) => [role.name, role]));
    const existingAdmins = await this.users.find({ where: { role: In([UserRole.SUPER_ADMIN, UserRole.ADMIN]) } });
    for (const user of existingAdmins) {
      let employee = await this.employees.findOneBy({ userId: user.id });
      if (!employee) employee = await this.employees.save(this.employees.create({ employeeId: await this.nextId('employee_internal_id_seq', 'EMP'), userId: user.id, firstName: user.firstName, lastName: user.lastName, displayName: `${user.firstName} ${user.lastName}`.trim() || null, email: user.email, status: user.isActive ? EmploymentStatus.ACTIVE : EmploymentStatus.SUSPENDED, employmentType: EmploymentType.FULL_TIME }));
      const systemRole = roleByName.get(user.role === UserRole.SUPER_ADMIN ? 'SUPER ADMIN' : 'ADMIN');
      if (systemRole && !await this.employeeRoles.exists({ where: { employeeId: employee.id, roleId: systemRole.id } })) await this.employeeRoles.save(this.employeeRoles.create({ employeeId: employee.id, roleId: systemRole.id, assignedBy: user.id }));
    }
  }
  async effectivePermissions(actor: Actor) {
    if (actor.role === UserRole.SUPER_ADMIN) return new Set(['*']);
    const effective = new Set<string>(actor.role === UserRole.ADMIN ? ADMIN_DEFAULT : []);
    const employee = await this.employees.findOneBy({ userId: actor.id });
    if (!employee) return effective;
    const assignments = await this.employeeRoles.findBy({ employeeId: employee.id });
    if (!assignments.length) return effective;
    const links = await this.rolePermissions.findBy({ roleId: In(assignments.map((item) => item.roleId)) });
    const permissionIds = [...new Set(links.map((item) => item.permissionId))];
    if (permissionIds.length) (await this.permissions.findBy({ id: In(permissionIds) })).forEach((item) => effective.add(item.key));
    return effective;
  }
  async assert(actor: Actor, permission: string) { const permissions = await this.effectivePermissions(actor); if (!permissions.has('*') && !permissions.has(permission)) throw new ForbiddenException('Bu amal uchun ruxsatingiz yo‘q.'); }
  private async employeeForUser(userId: string) { return this.employees.findOneBy({ userId }); }
  private async assertCanManageTarget(actor: Actor, employee: Employee) {
    const target = employee.userId ? await this.users.findOneBy({ id: employee.userId }) : null;
    if (target?.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Super Admin hisobini boshqara olmaysiz.');
  }
  async overview(actor: Actor) { await this.assert(actor, 'team.view'); const [employees, teams, roles, invited, suspended] = await Promise.all([this.employees.count(), this.teams.count({ where: { isActive: true } }), this.roles.count({ where: { isActive: true } }), this.employees.count({ where: { status: EmploymentStatus.INVITED } }), this.employees.count({ where: { status: EmploymentStatus.SUSPENDED } })]); return { employees, teams, roles, invited, suspended }; }
  async listEmployees(actor: Actor) { await this.assert(actor, 'employees.view'); const personal = (await this.effectivePermissions(actor)).has('*') || (await this.effectivePermissions(actor)).has('employees.personal_data.view'); const [list, memberships, roleAssignments, availableTeams] = await Promise.all([this.employees.find({ order: { createdAt: 'DESC' } }), this.employeeTeams.find(), this.employeeRoles.find(), this.teams.find()]); const teamMap = new Map(availableTeams.map((team) => [team.id, team])); return list.map((employee) => ({ id: employee.id, employeeId: employee.employeeId, firstName: employee.firstName, lastName: employee.lastName, displayName: employee.displayName, avatarUrl: employee.avatarUrl, email: employee.email, phone: personal ? employee.phone : undefined, jobTitle: employee.jobTitle, status: employee.status, employmentType: employee.employmentType, roleIds: roleAssignments.filter((assignment) => assignment.employeeId === employee.id).map((assignment) => assignment.roleId), teams: memberships.filter((membership) => membership.employeeId === employee.id).map((membership) => ({ id: membership.teamId, name: teamMap.get(membership.teamId)?.name ?? '—', primary: membership.isPrimary })), ...(personal ? { birthDate: employee.birthDate, residentialAddress: employee.residentialAddress, country: employee.country, region: employee.region, city: employee.city, emergencyContactName: employee.emergencyContactName, emergencyContactPhone: employee.emergencyContactPhone } : {}) })); }
  async createEmployee(actor: Actor, input: Partial<Employee> & { teamIds?: string[]; roleIds?: string[] }) {
    await this.assert(actor, 'employees.create'); if (!input.email?.trim()) throw new BadRequestException('Xodim e-maili majburiy.');
    if (await this.employees.exists({ where: { email: input.email.trim().toLowerCase() } })) throw new BadRequestException('Bu e-mail bilan xodim mavjud.');
    const employee = await this.employees.save(this.employees.create({ employeeId: await this.nextId('employee_internal_id_seq', 'EMP'), firstName: input.firstName?.trim() ?? '', lastName: input.lastName?.trim() ?? '', middleName: input.middleName ?? null, displayName: input.displayName ?? null, email: input.email.trim().toLowerCase(), phone: input.phone ?? null, avatarUrl: input.avatarUrl ?? null, jobTitle: input.jobTitle ?? null, employmentType: input.employmentType ?? undefined, status: EmploymentStatus.INVITED, startDate: input.startDate ?? null, region: input.region ?? null, city: input.city ?? null, country: input.country ?? null, createdAt: undefined as never, updatedAt: undefined as never }));
    await this.assignTeams(actor, employee.id, input.teamIds ?? []);
    if (input.roleIds?.length) await this.assignRoles(actor, employee.id, input.roleIds);
    return employee;
  }
  async updateEmployee(actor: Actor, id: string, input: Partial<Employee>) { await this.assert(actor, 'employees.edit'); const employee = await this.employees.findOneBy({ id }); if (!employee) throw new NotFoundException('Xodim topilmadi.'); await this.assertCanManageTarget(actor, employee); delete (input as Partial<Employee>).employeeId; delete (input as Partial<Employee>).userId; return this.employees.save({ ...employee, ...input, id: employee.id, employeeId: employee.employeeId, userId: employee.userId }); }
  async setEmployeeStatus(actor: Actor, id: string, status: EmploymentStatus) { await this.assert(actor, 'employees.deactivate'); const employee = await this.employees.findOneBy({ id }); if (!employee) throw new NotFoundException('Xodim topilmadi.'); await this.assertCanManageTarget(actor, employee); if (employee.userId && status !== EmploymentStatus.ACTIVE) await this.sessions.update({ userId: employee.userId, revokedAt: IsNull() }, { revokedAt: new Date() }); return this.employees.save({ ...employee, status, endDate: status === EmploymentStatus.TERMINATED ? new Date().toISOString().slice(0, 10) : employee.endDate }); }
  async listTeams(actor: Actor) { await this.assert(actor, 'team.view'); const [teams, members, employees] = await Promise.all([this.teams.find({ order: { createdAt: 'DESC' } }), this.employeeTeams.find(), this.employees.find()]); return teams.map((team) => ({ ...team, members: members.filter((member) => member.teamId === team.id).map((member) => ({ employeeId: member.employeeId, primary: member.isPrimary, name: employees.find((employee) => employee.id === member.employeeId)?.displayName || employees.find((employee) => employee.id === member.employeeId)?.firstName || '—' })) })); }
  async createTeam(actor: Actor, input: Partial<Team>) { await this.assert(actor, 'team.create'); if (!input.name?.trim()) throw new BadRequestException('Jamoa nomi majburiy.'); return this.teams.save(this.teams.create({ teamId: await this.nextId('team_internal_id_seq', 'TEAM'), name: input.name.trim(), description: input.description ?? null, iconUrl: input.iconUrl ?? null, color: input.color || '#465fff', parentId: input.parentId ?? null, leaderEmployeeId: input.leaderEmployeeId ?? null, createdBy: actor.id })); }
  async assignTeams(actor: Actor, employeeId: string, teamIds: string[]) { await this.assert(actor, 'team.edit'); if (!teamIds.length) return []; const valid = await this.teams.countBy({ id: In(teamIds), isActive: true }); if (valid !== new Set(teamIds).size) throw new BadRequestException('Noto‘g‘ri jamoa tanlangan.'); await this.employeeTeams.delete({ employeeId }); return this.employeeTeams.save(teamIds.map((teamId, index) => this.employeeTeams.create({ employeeId, teamId, isPrimary: index === 0 }))); }
  async listRoles(actor: Actor) { await this.assert(actor, 'roles.view'); const [roles, assignments, links, permissions] = await Promise.all([this.roles.find({ order: { isSystem: 'DESC', name: 'ASC' } }), this.employeeRoles.find(), this.rolePermissions.find(), this.permissions.find()]); return roles.map((role) => ({ ...role, assignedEmployees: assignments.filter((item) => item.roleId === role.id).length, permissions: links.filter((item) => item.roleId === role.id).map((link) => permissions.find((permission) => permission.id === link.permissionId)?.key).filter(Boolean) })); }
  async listPermissions(actor: Actor) { await this.assert(actor, 'permissions.view'); return this.permissions.find({ order: { module: 'ASC', key: 'ASC' } }); }
  async createRole(actor: Actor, input: { name: string; description?: string; color?: string; permissionKeys: string[] }) { await this.assert(actor, 'roles.create'); if (!input.name?.trim()) throw new BadRequestException('Rol nomi majburiy.'); const actorPermissions = await this.effectivePermissions(actor); const permissions = await this.permissions.findBy({ key: In(input.permissionKeys ?? []) }); if (permissions.length !== new Set(input.permissionKeys ?? []).size) throw new BadRequestException('Noma’lum ruxsat tanlangan.'); if (!actorPermissions.has('*') && permissions.some((permission) => !actorPermissions.has(permission.key))) throw new ForbiddenException('O‘zingizda bo‘lmagan ruxsatni rolga bera olmaysiz.'); const role = await this.roles.save(this.roles.create({ roleId: await this.nextId('role_internal_id_seq', 'ROLE'), name: input.name.trim(), description: input.description ?? null, color: input.color || '#465fff', createdBy: actor.id })); if (permissions.length) await this.rolePermissions.save(permissions.map((permission) => this.rolePermissions.create({ roleId: role.id, permissionId: permission.id, scope: PermissionScope.ALL }))); return role; }
  async assignRoles(actor: Actor, employeeId: string, roleIds: string[]) { await this.assert(actor, 'roles.assign'); const employee = await this.employees.findOneBy({ id: employeeId }); if (!employee) throw new NotFoundException('Xodim topilmadi.'); await this.assertCanManageTarget(actor, employee); const roles = await this.roles.findBy({ id: In(roleIds) }); if (roles.length !== new Set(roleIds).size || roles.some((role) => role.isProtected && actor.role !== UserRole.SUPER_ADMIN)) throw new ForbiddenException('Himoyalangan rolni biriktirish mumkin emas.'); const actorPermissions = await this.effectivePermissions(actor); if (!actorPermissions.has('*')) { const links = await this.rolePermissions.findBy({ roleId: In(roleIds) }); const permissions = links.length ? await this.permissions.findBy({ id: In(links.map((link) => link.permissionId)) }) : []; if (permissions.some((permission) => !actorPermissions.has(permission.key))) throw new ForbiddenException('O‘zingizda bo‘lmagan ruxsatli rolni bera olmaysiz.'); }
    await this.employeeRoles.delete({ employeeId }); return this.employeeRoles.save(roleIds.map((roleId) => this.employeeRoles.create({ employeeId, roleId, assignedBy: actor.id })));
  }
  async invite(actor: Actor, employeeId: string) { await this.assert(actor, 'employees.create'); const employee = await this.employees.findOneBy({ id: employeeId }); if (!employee?.email) throw new BadRequestException('Xodim e-maili kiritilmagan.'); const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); const invitation = await this.invitations.save(this.invitations.create({ employeeId, email: employee.email, tokenHash: await bcrypt.hash(token, 12), expiresAt: new Date(Date.now() + 7 * 86_400_000), createdBy: actor.id })); return { id: invitation.id, expiresAt: invitation.expiresAt, token }; }
  async listInvitations(actor: Actor) { await this.assert(actor, 'employees.view'); const now = new Date(); return (await this.invitations.find({ order: { createdAt: 'DESC' } })).map((item) => ({ id: item.id, employeeId: item.employeeId, email: item.email, createdAt: item.createdAt, expiresAt: item.expiresAt, status: item.cancelledAt ? 'cancelled' : item.acceptedAt ? 'accepted' : item.expiresAt < now ? 'expired' : 'pending' })); }
  async listSessions(actor: Actor) { await this.assert(actor, 'security.view'); const sessions = await this.sessions.find({ where: { kind: 'admin' }, order: { updatedAt: 'DESC' } }); const users = await this.users.findBy({ id: In(sessions.map((session) => session.userId).filter(Boolean) as string[]) }); return sessions.map((session) => ({ id: session.id, userId: session.userId, email: users.find((user) => user.id === session.userId)?.email ?? '—', role: users.find((user) => user.id === session.userId)?.role ?? '—', createdAt: session.createdAt, lastActivity: session.updatedAt, expiresAt: session.expiresAt, revokedAt: session.revokedAt })); }
  async revokeSession(actor: Actor, id: string) { await this.assert(actor, 'security.edit'); const session = await this.sessions.findOneBy({ id }); if (!session) throw new NotFoundException('Sessiya topilmadi.'); const target = session.userId ? await this.users.findOneBy({ id: session.userId }) : null; if (target?.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Super Admin sessiyasini bekor qila olmaysiz.'); await this.sessions.update({ id }, { revokedAt: new Date() }); return { revoked: true }; }
}
