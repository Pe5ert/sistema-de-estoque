import { Body, Controller, Get, Header, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, Matches, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { UserResponseDto } from '../auth/user-response.dto';
import { UserRole } from '../generated/prisma/client';
import { BackupsService } from './backups.service';

export class BackupScheduleInput {
  @IsBoolean() enabled!: boolean;
  @IsIn(['WEEKLY', 'MONTHLY']) frequency!: 'WEEKLY' | 'MONTHLY';
  @IsInt() @Min(0) @Max(6) weekday!: number;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) hour!: string;
}

@ApiTags('backups') @ApiCookieAuth('stock_session') @Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
export class BackupsController {
  constructor(@Inject(BackupsService) private readonly service: BackupsService) {}
  @Get() @Header('Cache-Control', 'no-store') list() { return this.service.list(); }
  @Post() @HttpCode(202) create(@CurrentUser() user: UserResponseDto) { return this.service.create(user.name); }
  @Patch('schedule') update(@Body(new ValidationPipe({ expectedType: BackupScheduleInput, transform: true, whitelist: true, forbidNonWhitelisted: true })) data: BackupScheduleInput) { return this.service.updateSchedule(data); }
  @Get(':id/download') @Header('Cache-Control', 'no-store') download(@Param('id', ParseUUIDPipe) id: string) { return this.service.download(id); }
}
