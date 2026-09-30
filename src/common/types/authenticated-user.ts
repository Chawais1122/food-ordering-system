import { UserRole } from '../../modules/users/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}
