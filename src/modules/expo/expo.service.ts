import configuration from '@/configs/configuration';
import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class ExpoService {
  logger: Logger;
  expo: Expo;

  constructor() {
    const config = configuration();
    this.logger = new Logger(ExpoService.name);
    this.expo = new Expo({
      accessToken: config.expo.accessToken,
      useFcmV1: true,
    });
  }

  pushNotification(pushTokens: string[], message: Omit<ExpoPushMessage, 'to'>) {
    const messages: ExpoPushMessage[] = [];

    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        this.logger.warn(
          `Push token ${pushToken} is not a valid Expo push token`,
        );
        continue;
      }

      messages.push({
        to: pushToken,
        ...message,
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    // const tickets: ExpoPushTicket[] = [];
    (async () => {
      for (let chunk of chunks) {
        try {
          let ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          //   tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error(
            `Error when send notification to ${chunk[0].to}`,
            error,
          );
        }
      }
    })();
  }
}
