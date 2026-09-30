import { QueryFailedError } from 'typeorm';

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
export const PG_CHECK_VIOLATION = '23514';
export const PG_INVALID_TEXT_REPRESENTATION = '22P02';

interface PostgresDriverError {
  code?: string;
  constraint?: string;
  detail?: string;
}

export const getPostgresError = (error: unknown): PostgresDriverError | undefined =>
  error instanceof QueryFailedError ? (error.driverError as PostgresDriverError) : undefined;

export const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
  const pgError = getPostgresError(error);
  return pgError?.code === PG_UNIQUE_VIOLATION && (!constraint || pgError.constraint === constraint);
};
