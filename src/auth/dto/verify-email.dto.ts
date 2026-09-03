import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VerifyEmailDto {
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  email: string;

  @Matches(/^\d{6}$/, { message: i18nValidationMessage('validation.OTP_FORMAT') })
  @Length(6, 6, { message: i18nValidationMessage('validation.OTP_FORMAT') })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  otp: string;
}
