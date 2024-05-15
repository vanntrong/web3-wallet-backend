import configuration from '@/configs/configuration';
import { JwtService } from '@nestjs/jwt';

export const extractJwt = (token: string, jwtService: JwtService) => {
  const configs = configuration();

  return jwtService.verify(token, {
    secret: configs.jwt.access_token_secret,
    maxAge: configs.jwt.access_token_expires_in,
  });
};
