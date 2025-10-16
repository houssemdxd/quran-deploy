/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

dotenv.config();

const serviceAccountPath = path.resolve(
  __dirname,
  '../quranapp-d4301-firebase-adminsdk-fbsvc-a8bd0eec88.json',
);
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Fichier de service non trouvé à : ${serviceAccountPath}`);
}

const firebaseAdminConfig = {
  credential: admin.credential.cert(require(serviceAccountPath)),
  storageBucket: process.env.STORAGE_BUCKET,
};

if (!admin.apps.length) {
  admin.initializeApp(firebaseAdminConfig);
}

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  const config = new DocumentBuilder()
    .setTitle('User Authentication')
    .setDescription(
      'The API details for the User Authentication Demo application using Firebase in the NestJS backend.',
    )
    .setVersion('1.0')
    .addTag('Authentication')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
