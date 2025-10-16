import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, IsIn } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class RegisterUserDto {
  @ApiProperty({ description: "Le prénom de l'utilisateur" })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Le nom de l'utilisateur" })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: "L'adresse email de l'utilisateur" })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Le mot de passe de l'utilisateur" })
  @IsNotEmpty()
  @Length(8, 20)
  password: string;

  @ApiProperty({
    description:
      "Le rôle de l'utilisateur (Listener ou Reciter pour un compte personnel, Institution pour une entreprise)",
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['Listener', 'Reciter', 'Institution'], {
    message: 'Le rôle doit être Listener, Reciter ou Institution',
  })
  role: UserRole;

  
}
