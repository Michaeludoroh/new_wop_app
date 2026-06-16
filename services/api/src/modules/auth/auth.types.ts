export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export type AuthUserPayload = {
  sub: string;
  email: string;
  role: AppRole;
  jti?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUserResponse = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};
