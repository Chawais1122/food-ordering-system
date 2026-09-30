import { HttpException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { IdentifierType, ParsedIdentifier } from '../../../common/utils/identifier.util';
import { TypedConfigService } from '../../../config/typed-config';
import { OtpService, OtpVerificationResult } from './otp.service';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

describe('OtpService', () => {
  const identifier: ParsedIdentifier = { type: IdentifierType.EMAIL, value: 'jane@example.com' };

  let manager: { query: jest.Mock; findOne: jest.Mock; update: jest.Mock };
  let service: OtpService;

  const config = {
    get: jest.fn(() => ({
      hashSecret: 'otp-secret',
      ttlSeconds: 300,
      length: 6,
      maxAttempts: 5,
      resendCooldownSeconds: 60,
    })),
  } as unknown as TypedConfigService;

  /** Issues a code and returns it along with the stored row, as the database would hold it. */
  const issueAndStore = async () => {
    const { code } = await service.issue(manager as unknown as EntityManager, identifier);
    const codeHash = manager.query.mock.calls[0][1][2];
    manager.findOne.mockResolvedValue({
      id: 'otp-1',
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + FIVE_MINUTES_MS),
    });
    return code;
  };

  beforeEach(() => {
    manager = {
      query: jest.fn().mockResolvedValue([{ id: 'otp-1' }]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    const dataSource = { transaction: jest.fn((work) => work(manager)) } as unknown as DataSource;
    service = new OtpService(dataSource, config);
  });

  afterEach(() => jest.useRealTimers());

  it('generates a 6-digit code that expires in 5 minutes', async () => {
    const issued = await service.issue(manager as unknown as EntityManager, identifier);

    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.expiresInSeconds).toBe(300);
  });

  it('stores only a hash of the code', async () => {
    const { code } = await service.issue(manager as unknown as EntityManager, identifier);

    const params: unknown[] = manager.query.mock.calls[0][1];
    expect(params).not.toContain(code);
    expect(params[2]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses to issue a new code during the resend cooldown', async () => {
    manager.query.mockResolvedValue([]);

    await expect(service.issue(manager as unknown as EntityManager, identifier)).rejects.toThrow(HttpException);
  });

  it('accepts a valid code and consumes it', async () => {
    const code = await issueAndStore();

    await expect(service.verify(identifier, code)).resolves.toBe(OtpVerificationResult.VALID);
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'otp-1', { codeHash: null });
  });

  it('rejects a code after 5 minutes', async () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') });
    const code = await issueAndStore();

    jest.setSystemTime(Date.now() + FIVE_MINUTES_MS);

    await expect(service.verify(identifier, code)).resolves.toBe(OtpVerificationResult.EXPIRED);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const code = await issueAndStore();
    const wrongCode = code === '000000' ? '111111' : '000000';

    await expect(service.verify(identifier, wrongCode)).resolves.toBe(OtpVerificationResult.INVALID);
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'otp-1', { attempts: 1 });
  });
});
