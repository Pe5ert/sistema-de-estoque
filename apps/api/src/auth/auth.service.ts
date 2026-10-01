import { Inject, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { argon2id, hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './login.dto';
import { publicUser, UserResponseDto } from './user-response.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    // An absent account still performs a password verification.
    this.dummyHash = await hash(randomBytes(32), { type: argon2id });
  }

  async login(credentials: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email.trim().toLowerCase() },
    });
    let valid = false;
    try {
      valid = await verify(user?.passwordHash ?? this.dummyHash, credentials.password);
    } catch {
      // Malformed/legacy hashes fail closed without exposing account details.
    }
    if (!user || !user.active || !valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    return {
      user: publicUser(user),
      token: await this.jwt.signAsync({ sub: user.id, role: user.role }),
    };
  }

  async authenticate(token: string): Promise<UserResponseDto> {
    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      if (typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.sub)) {
        throw new Error('Invalid subject');
      }
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException('Sessão inválida ou expirada.');
    // The current database role is authoritative, rather than a stale JWT claim.
    return publicUser(user);
  }
}
