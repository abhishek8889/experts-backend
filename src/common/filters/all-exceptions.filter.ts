import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  I18nContext,
  I18nService,
  I18nValidationException,
} from 'nestjs-i18n';
import { formatI18nErrors } from 'nestjs-i18n/dist/utils/util.js';
import { ValidationError } from 'class-validator';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const lang = I18nContext.current()?.lang;
    const validationErrors = this.getValidationErrors(exception);

    if (validationErrors) {
      const formatted = formatI18nErrors(validationErrors, this.i18n, { lang });
      const error = this.pickPriorityError(formatted);
      const message =
        error?.message ??
        this.i18n.t('validation.IS_NOT_EMPTY', {
          lang,
          args: { property: 'request' },
        });

      return response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message,
        statusCode: HttpStatus.BAD_REQUEST,
        errors: error ? [error] : [],
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawMessage = this.extractMessage(exception.getResponse());
      const message = this.translateMessage(rawMessage, lang);

      return response.status(status).json({
        success: false,
        message,
        statusCode: status,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: this.i18n.t('common.INTERNAL_ERROR', { lang }),
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  private getValidationErrors(exception: unknown): ValidationError[] | null {
    if (exception instanceof I18nValidationException) {
      return exception.errors ?? [];
    }

    if (!(exception instanceof HttpException) || exception.getStatus() !== 400) {
      return null;
    }

    const exceptionResponse = exception.getResponse();

    if (this.isValidationErrorList(exceptionResponse)) {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'errors' in exceptionResponse &&
      this.isValidationErrorList(
        (exceptionResponse as { errors: unknown }).errors,
      )
    ) {
      return (exceptionResponse as { errors: ValidationError[] }).errors;
    }

    return null;
  }

  private isValidationErrorList(value: unknown): value is ValidationError[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'property' in value[0]
    );
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: string | string[] })
        .message;
      if (Array.isArray(message)) {
        return typeof message[0] === 'string' ? message[0] : '';
      }
      return message;
    }

    return 'common.INTERNAL_ERROR';
  }

  private translateMessage(message: string, lang?: string): string {
    if (!message || message === 'Internal Server Error') {
      return this.i18n.t('common.INTERNAL_ERROR', { lang });
    }

    if (message === 'Unauthorized') {
      return this.i18n.t('auth.UNAUTHORIZED', { lang });
    }

    if (this.looksLikeI18nKey(message)) {
      return this.i18n.t(message, { lang });
    }

    return message;
  }

  private looksLikeI18nKey(message: string): boolean {
    return /^[a-z0-9_-]+\.[A-Z0-9._-]+$/i.test(message);
  }

  private readonly fieldPriority = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'password',
    'role',
    'otp',
  ];
  private readonly constraintPriority = [
    'isNotEmpty',
    'isDefined',
    'isString',
    'isEmail',
    'minLength',
    'isLength',
    'matches',
    'isIn',
  ];

  private pickPriorityError(
    errors: ValidationError[],
  ): { field: string; message: string } | null {
    const flattened = this.flattenValidationErrors(errors);
    if (!flattened.length) {
      return null;
    }

    flattened.sort((a, b) => {
      const fieldDiff = this.fieldRank(a.field) - this.fieldRank(b.field);
      if (fieldDiff !== 0) {
        return fieldDiff;
      }
      return this.constraintRank(a.constraint) - this.constraintRank(b.constraint);
    });

    const first = flattened[0];
    return { field: first.field, message: first.message };
  }

  private fieldRank(field: string) {
    const index = this.fieldPriority.indexOf(field);
    return index === -1 ? this.fieldPriority.length : index;
  }

  private constraintRank(constraint: string) {
    const index = this.constraintPriority.indexOf(constraint);
    return index === -1 ? this.constraintPriority.length : index;
  }

  private flattenValidationErrors(
    errors: ValidationError[],
    parent?: string,
  ): { field: string; constraint: string; message: string }[] {
    const result: { field: string; constraint: string; message: string }[] = [];

    for (const error of errors) {
      const field = parent ? `${parent}.${error.property}` : error.property;

      if (error.constraints) {
        for (const [constraint, message] of Object.entries(error.constraints)) {
          result.push({ field, constraint, message });
        }
      }

      if (error.children?.length) {
        result.push(...this.flattenValidationErrors(error.children, field));
      }
    }

    return result;
  }
}
