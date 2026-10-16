import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let user: Awaited<ReturnType<typeof this.prisma.user.create>>;
    try {
      user = await this.prisma.user.create({
        data: { email: dto.email, password: hashedPassword, name: dto.name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    return this.buildAuthResponse(
      user.id,
      user.email,
      user.name,
      user.hasSeenGuide,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(
      user.id,
      user.email,
      user.name,
      user.hasSeenGuide,
    );
  }

  async completeOnboarding(userId: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { hasSeenGuide: true },
    });
    return { hasSeenGuide: user.hasSeenGuide };
  }

  // Case-insensitive so accounts created before emails were normalized still match.
  private findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  private buildAuthResponse(
    userId: number,
    email: string,
    name: string,
    hasSeenGuide: boolean,
  ) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    return { accessToken, user: { id: userId, email, name, hasSeenGuide } };
  }
}
