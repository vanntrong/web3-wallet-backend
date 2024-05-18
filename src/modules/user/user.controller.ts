import { User } from '@/decorators';
import { JwtAuthGuard } from '@/guards/jwt.guard';
import { generateResponse } from '@/utils/response';
import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  Logger,
  ParseFilePipe,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { omit } from 'lodash';
import {
  AddNetworksDto,
  AddPushNotificationTokenDto,
  GetBalanceTokenDto,
  ImportTokenDto,
  RemoveNetworksDto,
  UpdateUserDto,
} from './user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  logger: Logger;
  constructor(private readonly userService: UserService) {
    this.logger = new Logger(UserController.name);
  }

  @Patch('/networks/add')
  @UseGuards(JwtAuthGuard)
  addNetworks(@User('id') id: string, @Body() body: AddNetworksDto) {
    return this.userService.addNetwork(id, body.networkIds);
  }

  @Patch('/networks/remove')
  @UseGuards(JwtAuthGuard)
  removeNetworks(@User('id') id: string, @Body() body: RemoveNetworksDto) {
    return this.userService.removeNetwork(id, body.networkIds);
  }

  @Patch('/tokens/import')
  @UseGuards(JwtAuthGuard)
  importToken(@User('id') id: string, @Body() body: ImportTokenDto) {
    return this.userService.importToken(id, body);
  }

  @Get('/tokens/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@User('id') id: string, @Query() query: GetBalanceTokenDto) {
    const response = await this.userService.getBalance(id, query);
    return generateResponse('success', response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@User('id') id: string) {
    const response = await this.userService.findById(id, {
      networks: {
        networkSwap: true,
      },
      currentSelectedNetwork: {
        networkSwap: true,
      },
    });
    this.logger.log('get me', id);

    return generateResponse(
      'success',
      omit(response, ['secret', 'password', 'pushNotificationTokens']),
    );
  }

  @Get('me/tokens')
  @UseGuards(JwtAuthGuard)
  async getMyToken(
    @User('id') id: string,
    @Query('networkId') networkId: string,
  ) {
    const response = await this.userService.getUserTokens(id, networkId);

    return generateResponse('success', response);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateMe(
    @User('id') id: string,
    @Body() body: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'image/*' })],
        fileIsRequired: false,
      }),
    )
    avatar: Express.Multer.File,
  ) {
    const response = await this.userService.update(id, {
      ...body,
      avatar,
    });
    return generateResponse('success', omit(response, ['secret', 'password']));
  }

  @Patch('me/push-notification-tokens/add')
  @UseGuards(JwtAuthGuard)
  async addPushNotificationToken(
    @User('id') id: string,
    @Body() body: AddPushNotificationTokenDto,
  ) {
    const response = await this.userService.addPushNotificationToken(id, body);

    return generateResponse('success', response);
  }
}
