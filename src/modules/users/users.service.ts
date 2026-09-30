import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentifierType, ParsedIdentifier } from '../../common/utils/identifier.util';
import { isUniqueViolation } from '../../common/utils/postgres-error.util';
import { UQ_USERS_EMAIL, UQ_USERS_PHONE, User } from './user.entity';

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async create(data: CreateUserData): Promise<User> {
    try {
      return await this.users.save(this.users.create(data));
    } catch (error) {
      if (isUniqueViolation(error, UQ_USERS_EMAIL)) {
        throw new ConflictException('Email is already registered');
      }
      if (isUniqueViolation(error, UQ_USERS_PHONE)) {
        throw new ConflictException('Phone number is already registered');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    return this.users.findOneBy({ id });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByIdentifier(identifier: ParsedIdentifier): Promise<User | null> {
    return this.users.findOneBy(this.identifierWhere(identifier));
  }

  findByIdentifierWithPassword(identifier: ParsedIdentifier): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where(this.identifierWhere(identifier))
      .getOne();
  }

  private identifierWhere({ type, value }: ParsedIdentifier): Partial<Pick<User, 'email' | 'phone'>> {
    return type === IdentifierType.EMAIL ? { email: value } : { phone: value };
  }
}
