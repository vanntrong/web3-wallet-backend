import configuration from '@/configs/configuration';
import { ERROR_MAP } from '@/constants/errorMap';
import { User } from '@/entities/user/user.entity';
import { UserSecret } from '@/entities/user/userSecret.entity';
import { validateSignature } from '@/utils/crypto';
import { generateResponse } from '@/utils/response';
import { generateRandomMnemonic, getAccountFromMnemonic } from '@/utils/wallet';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import {
  ImportWalletDto,
  SignInDto,
  SignInWithBiometricDto,
  SignUpDto,
} from './auth.dto';
import { TTokens } from './auth.type';

@Injectable()
export class AuthService {
  logger: Logger;

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserSecret)
    private readonly userSecretRepository: Repository<UserSecret>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {
    this.logger = new Logger(AuthService.name);
  }

  async signUp(data: SignUpDto) {
    const isEmailExist = await this.userService.$isEmailExist(data.email);
    if (isEmailExist) {
      throw new BadRequestException(ERROR_MAP.EMAIL_ALREADY_EXIST);
    }

    const mnemonic = generateRandomMnemonic();
    const account = getAccountFromMnemonic(mnemonic);

    // hash password
    const passwordHashed = this.$hashPassword(data.password);
    const {
      user: { id },
    } = await this.userService.createUser(
      {
        ...data,
        password: passwordHashed,
        mnemonic,
        ...account,
      },
      true,
    );

    const token = this.$signTokens({
      id,
      address: account.address,
    });

    return generateResponse('Success', {
      id,
      mnemonic,
      address: account.address,
      token,
    });
  }

  async signIn(data: SignInDto) {
    const user = await this.userRepository.findOne({
      where: [
        {
          email: data.email,
        },
        {
          address: data.address,
        },
      ],
    });

    if (!user)
      throw new NotFoundException(ERROR_MAP.INVALID_IDENTIFY_OR_PASSWORD);

    const isPasswordMatched = this.$comparePassword(
      data.password,
      user.password,
    );
    if (!isPasswordMatched)
      throw new NotFoundException(ERROR_MAP.INVALID_IDENTIFY_OR_PASSWORD);

    if (data.biometricPublicKey) {
      this.userSecretRepository.update(
        {
          user: {
            id: user.id,
          },
        },
        {
          biometricPublicKey: data.biometricPublicKey,
        },
      );
    }

    const token = this.$signTokens({
      id: user.id,
      address: user.address,
    });

    return generateResponse('success', {
      token,
    });
  }

  async importWallet(body: ImportWalletDto) {
    const { mnemonic, password } = body;

    const existUserSecret = await this.userSecretRepository.findOne({
      where: {
        mnemonic,
      },
      relations: {
        user: true,
      },
    });

    if (existUserSecret) {
      // have secret -> user already exist
      this.logger.log(`User ${mnemonic} already exist -> sign in`);
      const passwordHashed = this.$hashPassword(password);
      const userSecret = await this.userSecretRepository.save({
        ...existUserSecret,
        password: passwordHashed,
        biometricPublicKey: body.biometricPublicKey,
      });

      return this.$signTokens({
        id: userSecret.user.id,
        address: userSecret.user.address,
      });
    }

    this.logger.log(`User ${mnemonic} not exist -> create new account`);
    // dont have secret -> create a new account with new mnemonic

    const account = getAccountFromMnemonic(mnemonic);

    // hash password
    const passwordHashed = this.$hashPassword(password);
    const {
      user: { id },
    } = await this.userService.createUser(
      {
        password: passwordHashed,
        mnemonic,
        biometricPublicKey: body.biometricPublicKey,
        ...account,
      },
      true,
    );

    return this.$signTokens({
      id,
      address: account.address,
    });
  }

  async signInWithBiometric(body: SignInWithBiometricDto) {
    const user = await this.userService.findById(body.userId, {
      secret: true,
    });

    if (!user) {
      throw new NotFoundException(ERROR_MAP.INVALID_IDENTIFY_OR_PASSWORD);
    }

    const biometricPublicKey = user.secret.biometricPublicKey;
    if (!biometricPublicKey) {
      throw new BadRequestException(ERROR_MAP.USER_HAS_NO_REGISTER_BIOMETRIC);
    }

    const isVerified = validateSignature(
      body.signature,
      body.userId,
      biometricPublicKey,
    );

    if (!isVerified) {
      throw new BadRequestException(ERROR_MAP.INVALID_SIGNATURE);
    }

    const tokens = this.$signTokens({
      id: user.id,
      address: user.address,
    });

    return {
      tokens,
    };
  }

  private $comparePassword(password: string, hash: string) {
    return bcryptjs.compareSync(password, hash);
  }

  private $hashPassword(password: string) {
    return bcryptjs.hashSync(password, 10);
  }

  private $signTokens(payload: { [key: string]: string[] | string }): TTokens {
    const config = configuration();
    const accessToken = this.jwtService.sign(payload, {
      secret: config.jwt.access_token_secret,
      expiresIn: config.jwt.access_token_expires_in,
      algorithm: 'HS256',
      header: {
        kid: 'sim1',
        alg: 'HS256',
        typ: 'JWT',
      },
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: config.jwt.refresh_token_secret,
      expiresIn: config.jwt.refresh_token_expires_in,
      algorithm: 'HS256',
      header: {
        kid: 'sim1',
        alg: 'HS256',
        typ: 'JWT',
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      exp: config.jwt.access_token_expires_in,
    };
  }
}
