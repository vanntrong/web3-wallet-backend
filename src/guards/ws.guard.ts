import configuration from '@/configs/configuration';
import { CanActivate, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(
    context: any,
  ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    const bearerToken =
      context.args[0].handshake.headers.authorization.split(' ')[1];
    try {
      const configs = configuration();
      const decoded = this.jwtService.verify(bearerToken, {
        secret: configs.jwt.access_token_secret,

        maxAge: configs.jwt.access_token_expires_in,
      }) as any;
      console.log(decoded);
      //   return new Promise((resolve, reject) => {
      //     return this.userService
      //       .findByUsername(decoded.username)
      //       .then((user) => {
      //         if (user) {
      //           resolve(user);
      //         } else {
      //           reject(false);
      //         }
      //       });
      //   });
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }
}
