import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError } from 'typeorm';
import { TypedConfigService } from '../../config/typed-config';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../users/user-role.enum';
import { UQ_USERS_EMAIL, UQ_USERS_PHONE, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const JWT_SECRET = 'test-secret';

const uniqueViolation = (constraint: string) =>
  new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505', constraint }));

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    name: 'Jane',
    email: 'jane@example.com',
    phone: '+923001234567',
    role: UserRole.CUSTOMER,
    passwordHash: 'stored-hash',
  } as User;

  let usersRepo: { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let queryBuilder: { addSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let passwordService: jest.Mocked<Pick<PasswordService, 'hash' | 'compare' | 'compareAgainstDummy'>>;
  let jwtService: JwtService;
  let service: AuthService;

  beforeEach(() => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    usersRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ ...user, ...data })),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    passwordService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn().mockResolvedValue(true),
      compareAgainstDummy: jest.fn().mockResolvedValue(false),
    };

    const manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (data) => ({ ...data, id: '11111111-1111-1111-1111-111111111111' })),
    };
    const dataSource = { manager } as unknown as DataSource;
    const config = {
      get: jest.fn((key: string) =>
        key === 'auth' ? { accessTtlSeconds: 900, refreshTtlDays: 30 } : { ttlSeconds: 300 },
      ),
    } as unknown as TypedConfigService;

    jwtService = new JwtService({ secret: JWT_SECRET });
    const tokenService = new TokenService(jwtService, dataSource, {} as never, config);

    service = new AuthService(
      new UsersService(usersRepo as never),
      passwordService as unknown as PasswordService,
      tokenService,
      {} as OtpService,
      {} as NotificationsService,
      dataSource,
      config,
    );
  });

  describe('register', () => {
    const dto = { name: 'Jane', email: 'jane@example.com', phone: '+923001234567', password: 'Secret123!' };

    it('stores a hashed password, never the plain one', async () => {
      await service.register(dto);

      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'hashed-password' }));
      expect(usersRepo.create).not.toHaveBeenCalledWith(expect.objectContaining({ password: dto.password }));
    });

    it('returns the user without the password hash', async () => {
      const result = await service.register(dto);

      expect(result.user).toMatchObject({ id: user.id, email: user.email });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email', async () => {
      usersRepo.save.mockRejectedValue(uniqueViolation(UQ_USERS_EMAIL));

      await expect(service.register(dto)).rejects.toThrow(new ConflictException('Email is already registered'));
    });

    it('rejects a duplicate phone number', async () => {
      usersRepo.save.mockRejectedValue(uniqueViolation(UQ_USERS_PHONE));

      await expect(service.register(dto)).rejects.toThrow(
        new ConflictException('Phone number is already registered'),
      );
    });
  });

  describe('login', () => {
    it('finds the user by normalized email', async () => {
      await service.login({ identifier: '  Jane@Example.COM ', password: 'Secret123!' });

      expect(queryBuilder.where).toHaveBeenCalledWith({ email: 'jane@example.com' });
    });

    it('finds the user by phone number', async () => {
      await service.login({ identifier: '+92 300 1234567', password: 'Secret123!' });

      expect(queryBuilder.where).toHaveBeenCalledWith({ phone: '+923001234567' });
    });

    it('rejects a wrong password', async () => {
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login({ identifier: user.email, password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an unknown user with the same error as a wrong password', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.login({ identifier: 'nobody@example.com', password: 'x' })).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(passwordService.compareAgainstDummy).toHaveBeenCalled();
    });

    it('returns a signed JWT for the user', async () => {
      const { tokens } = await service.login({ identifier: user.email, password: 'Secret123!' });

      const payload = await jwtService.verifyAsync(tokens.accessToken, { secret: JWT_SECRET });
      expect(payload).toMatchObject({ sub: user.id, role: user.role });
      expect(tokens).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
      expect(tokens.refreshToken).toMatch(/^11111111-1111-1111-1111-111111111111\..+/);
    });
  });
});
