import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserWithAccess } from '../../users/users.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserWithAccess => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: UserWithAccess }>();
    return request.user;
  },
);
