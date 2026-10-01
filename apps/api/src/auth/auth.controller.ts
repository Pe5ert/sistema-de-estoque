import { Body, Controller, Get, Header, HttpCode, Inject, Post, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, SESSION_SECONDS, sessionCookieOptions } from './auth.config';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './login.dto';
import { UserResponseDto } from './user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Iniciar sessão de 8 horas em cookie HttpOnly' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Credenciais malformadas' })
  @ApiResponse({ status: 401, description: 'E-mail ou senha inválidos' })
  @ApiResponse({ status: 403, description: 'Origin diferente de WEB_ORIGIN' })
  @ApiResponse({ status: 429, description: 'Limite de 8 tentativas por minuto/IP' })
  async login(
    // tsx dev does not emit decorator metadata; keep DTO validation explicit.
    @Body(new ValidationPipe({ expectedType: LoginDto, transform: true, whitelist: true })) credentials: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const { user, token } = await this.auth.login(credentials);
    response.cookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(this.config), maxAge: SESSION_SECONDS * 1000,
    });
    return user;
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Consultar o usuário da sessão atual' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Sessão ausente, inválida, expirada ou usuário inativo' })
  me(@CurrentUser() user: UserResponseDto): UserResponseDto {
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Remover o cookie de sessão (idempotente)' })
  @ApiResponse({ status: 204, description: 'Cookie removido' })
  @ApiResponse({ status: 403, description: 'Origin diferente de WEB_ORIGIN' })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions(this.config));
  }
}
