import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRole, AuthSession, Employee, EmployeeInvitation, EmployeeRole, EmployeeTeam, Permission, RolePermission, Team, User } from '../database/entities';
import { TeamRbacController } from './team-rbac.controller';
import { TeamRbacService } from './team-rbac.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee, Team, EmployeeTeam, AdminRole, Permission, RolePermission, EmployeeRole, EmployeeInvitation, AuthSession])],
  controllers: [TeamRbacController],
  providers: [TeamRbacService],
  exports: [TeamRbacService],
})
export class TeamRbacModule {}
