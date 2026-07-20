export type RequestUser = {
  id: string;
  companyId: string;
  email: string;
  username: string;
  displayName: string;
  status: string;
  roles: string[];
  permissions: string[];
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
  cookies?: Record<string, string>;
  ip?: string;
  headers: Headers & Record<string, string | string[] | undefined>;
};
