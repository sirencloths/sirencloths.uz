import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRole, AuthSession, Employee, EmployeeInvitation, EmployeeRole, EmployeeTeam, Permission, RolePermission, Team, User } from '../database/entities';
import { TeamInvitationController, TeamRbacController } from './team-rbac.controller';
import { TeamRbacService } from './team-rbac.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee, Team, EmployeeTeam, AdminRole, Permission, RolePermission, EmployeeRole, EmployeeInvitation, AuthSession])],
  controllers: [TeamRbacController, TeamInvitationController],
  providers: [TeamRbacService],
  exports: [TeamRbacService],
})
export class TeamRbacModule {}
