import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.strategy';
import { EmploymentStatus, EmploymentType, UserRole } from '../database/entities';
import { TeamRbacService } from './team-rbac.service';

class EmployeeDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() teamIds?: string[];
  @IsOptional() @IsArray() roleIds?: string[];
}
class TeamDto { @IsString() @MaxLength(140) name!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() color?: string; @IsOptional() @IsString() parentId?: string; @IsOptional() @IsString() leaderEmployeeId?: string; }
class RoleDto { @IsString() @MaxLength(120) name!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() color?: string; @IsArray() permissionKeys!: string[]; }
class RolesDto { @IsArray() roleIds!: string[]; }
class TeamsDto { @IsArray() teamIds!: string[]; }
class StatusDto { @IsEnum(EmploymentStatus) status!: EmploymentStatus; }

@UseGuards(JwtAuthGuard)
@Controller('admin/team')
export class TeamRbacController {
  constructor(private readonly team: TeamRbacService) {}
  @Get('overview') overview(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.overview(actor); }
  @Get('employees') employees(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listEmployees(actor); }
  @Post('employees') createEmployee(@Body() body: EmployeeDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.createEmployee(actor, body); }
  @Patch('employees/:id') updateEmployee(@Param('id') id: string, @Body() body: Partial<EmployeeDto>, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.updateEmployee(actor, id, body); }
  @Patch('employees/:id/status') status(@Param('id') id: string, @Body() body: StatusDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.setEmployeeStatus(actor, id, body.status); }
  @Post('employees/:id/teams') teamsForEmployee(@Param('id') id: string, @Body() body: TeamsDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.assignTeams(actor, id, body.teamIds); }
  @Post('employees/:id/roles') rolesForEmployee(@Param('id') id: string, @Body() body: RolesDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.assignRoles(actor, id, body.roleIds); }
  @Post('employees/:id/invitations') invite(@Param('id') id: string, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.invite(actor, id); }
  @Get('teams') teams(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listTeams(actor); }
  @Post('teams') createTeam(@Body() body: TeamDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.createTeam(actor, body); }
  @Get('roles') roles(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listRoles(actor); }
  @Post('roles') createRole(@Body() body: RoleDto, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.createRole(actor, body); }
  @Get('permissions') permissions(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listPermissions(actor); }
  @Get('invitations') invitations(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listInvitations(actor); }
  @Get('security/sessions') sessions(@CurrentUser() actor: { id: string; role: UserRole }) { return this.team.listSessions(actor); }
  @Post('security/sessions/:id/revoke') revokeSession(@Param('id') id: string, @CurrentUser() actor: { id: string; role: UserRole }) { return this.team.revokeSession(actor, id); }
}
