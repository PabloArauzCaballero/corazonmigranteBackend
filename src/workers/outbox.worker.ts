import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { MessagingService } from '@/modules/messaging/messaging.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const messaging = app.get(MessagingService);
  const result = await messaging.processPending(100);
  // eslint-disable-next-line no-console
  console.log(result);
  await app.close();
}
run();
