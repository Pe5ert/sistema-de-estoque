import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ type: String, example: 'admin@estoque.local', maxLength: 180 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email!: string;

  @ApiProperty({ type: String, format: 'password', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(128)
  password!: string;
}
