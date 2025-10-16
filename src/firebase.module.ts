import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccountPath = path.resolve(
          __dirname,
          '../quranapp-d4301-firebase-adminsdk-fbsvc-a8bd0eec88.json',
        );
        if (!fs.existsSync(serviceAccountPath)) {
          throw new Error(
            `Fichier de service non trouvé à : ${serviceAccountPath}`,
          );
        }

        const firebaseAdminConfig = {
          credential: admin.credential.cert(require(serviceAccountPath)),
          storageBucket: process.env.STORAGE_BUCKET,
        };

        if (!admin.apps.length) {
          admin.initializeApp(firebaseAdminConfig);
        }
        return admin;
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
