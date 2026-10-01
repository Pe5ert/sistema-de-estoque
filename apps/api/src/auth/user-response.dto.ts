import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';

export class UserResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, format: 'email' })
  email!: string;

  @ApiProperty({ type: String, enum: UserRole })
  role!: UserRole;
}

export function publicUser(user: UserResponseDto): UserResponseDto {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
