import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Headers,
  UnauthorizedException,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import * as firebaseAdmin from 'firebase-admin';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from './entities/user.entity';
import { multerOptions } from 'src/media.service/multer.config';
import { Video } from 'src/video/entities/video.entity';
import { GoogleLoginDto } from './dto/google-login.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}


  
 @Get('/profile/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getUserById(@Param('userId') userId: string): Promise<Partial<User>> {
    return this.userService.getUserByIdPublic(userId);
  }
  @Post('register')
  @UsePipes(new ValidationPipe({ transform: true }))
  async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return this.userService.registerUser(registerUserDto);
  }
  @Post('login')
  @UsePipes(new ValidationPipe({ transform: true }))
  login(@Body() loginDto: LoginDto) {
    return this.userService.loginUser(loginDto);
  }

  @Post('validate-token')
  async validateToken(@Body('idToken') idToken: string): Promise<boolean> {
    return this.userService.validateToken(idToken);
  }

  @Put('update-user')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar', multerOptions))
  async updateUser(
    @Headers('authorization') token: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> {
    console.log('Token reçu:', token);
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    console.log('UID extrait:', uid);
    console.log('Fichier reçu:', file);
    console.log('updateUserDto:', updateUserDto);

    if (file) {
      updateUserDto.avatar = file;
    } else {
      delete updateUserDto.avatar;
    }
    return this.userService.updateUser(uid, updateUserDto);
  }

  @Post('forget-password')
  @UsePipes(new ValidationPipe({ transform: true }))
  async forgetPassword(
    @Body() forgetPasswordDto: ForgetPasswordDto,
  ): Promise<{ message: string }> {
    return this.userService.forgetPassword(forgetPasswordDto.email);
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    return this.userService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Headers('authorization') token: string,
  ): Promise<void> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.changePassword(uid, changePasswordDto);
  }

  @Delete('delete-user')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteUser(@Headers('authorization') token: string): Promise<void> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.deleteUser(uid);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getUserProfile(
    @Headers('authorization') token: string,
  ): Promise<User & { videoCount: number; videos: Video[] }> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.getUserProfile(uid);
  }

  @Post('follow/:targetId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async followUser(
    @Headers('authorization') token: string,
    @Param('targetId') targetId: string,
  ): Promise<void> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.followUser(uid, targetId);
  }

  @Post('unfollow/:targetId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async unfollowUser(
    @Headers('authorization') token: string,
    @Param('targetId') targetId: string,
  ): Promise<void> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.unfollowUser(uid, targetId);
  }

  @Get('google-login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.userService.googleLogin(googleLoginDto);
  }
/*
  @Get(':userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getUserById(@Param('userId') userId: string): Promise<Partial<User>> {
    return this.userService.getUserByIdPublic(userId);
  }
*/
  @Get('followers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getFollowersList(
    @Headers('authorization') token: string,
  ): Promise<Partial<User>[]> {
    const decodedToken = await firebaseAdmin
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''));
    const uid = decodedToken.uid;
    return this.userService.getFollowersList(uid);
  }

  @Get('all-reciters')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getAllReciters() {
    return this.userService.getAllReciters();
  }
}
