import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

interface RequestWithUser {
  user?: RequestUser;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (data && user) {
      return user[data];
    }

    return user;
  },
);
