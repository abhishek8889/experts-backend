import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { map, Observable } from 'rxjs';
import { isTranslatedResult } from '../types/translated-result';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        const lang = I18nContext.current()?.lang;

        if (isTranslatedResult(body)) {
          return {
            success: true,
            message: this.i18n.t(body.messageKey, {
              lang,
              args: body.messageArgs,
            }),
            data: body.data ?? null,
          };
        }

        return {
          success: true,
          message: this.i18n.t('common.SUCCESS', { lang }),
          data: body ?? null,
        };
      }),
    );
  }
}
