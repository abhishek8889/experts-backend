import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserWithAccess } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Post('profile-update')
  updateProfile(
    @CurrentUser() user: UserWithAccess,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user, dto);
  }
}
