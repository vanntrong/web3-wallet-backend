import { extractJwt } from '@/utils/extractJwt';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateTransactionDto } from '../transaction/transaction.dto';
import { UserService } from '../user/user.service';
import customParser from 'socket.io-msgpack-parser';

// always as string
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return String(this);
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  parser: customParser,
})
@Injectable()
export class WsGateway {
  logger: Logger;
  connectedClients: Map<string, Socket> = new Map();
  @WebSocketServer() private readonly server: Server;
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {
    this.logger = new Logger(WsGateway.name);
  }

  onModuleInit() {
    this.server.on('connection', (socket) => {
      try {
        const token = socket.handshake.headers.authorization?.split(' ')[1];
        if (token) {
          const decoded = extractJwt(token, this.jwtService);
          this.connectedClients.set(decoded.id, socket);
        }
        this.logger.log(`Client connected: ${socket.id}`);
      } catch (error) {
        console.log(error);
      }
    });
  }

  @SubscribeMessage('createTransaction')
  async createTransaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CreateTransactionDto,
  ) {
    this.server.to(client.id).emit('createTransactionSuccess', body);
  }

  sendToClient(userId: string, event: string, data: any) {
    const socket = this.connectedClients.get(userId);
    if (!socket) return;
    this.server.to(socket.id).emit(event, data);
  }

  sendToAllClients(event: string, data: any) {
    this.server.emit(event, data);
  }

  async updateNewBalance(userId: string, networkId: string) {
    const response = await this.userService.getUserTokens(userId, networkId);
    const socket = this.connectedClients.get(userId);
    if (!socket || !response) return;
    this.server.to(socket.id).emit('updateNewBalance', response);
  }
}
