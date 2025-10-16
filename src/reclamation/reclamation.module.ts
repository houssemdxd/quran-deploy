// src/reclamation/reclamation.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ReclamationController } from './reclamation.controller';
import { UserModule } from 'src/user/user.module';
import { ReclamationService } from './reclamation.service';

@Module({
  imports: [forwardRef(() => UserModule)], // ✅ ajout ici
  controllers: [ReclamationController],
  providers: [ReclamationService],
})
export class ReclamationModule {}