export type RequestUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export type RequestUser = {
  sub: string;
  email: string;
  role: RequestUserRole;
};
