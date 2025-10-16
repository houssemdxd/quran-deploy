/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';

@Controller('token')
export class LivekitController {
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

  @Get()
  async getToken(
    @Query('identity') identity: string,
    @Query('roomName') roomName: string,
    @Res() res: Response,
  ) {
    const userIdentity = identity || 'viewer1';
    const room = roomName || 'test-room';

    try {
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: userIdentity,
        name: userIdentity,
      });

      token.addGrant({
        roomJoin: true,
        room,
      });

      const jwt = await token.toJwt();
      return res.json({ token: jwt });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.toString() });
    }
  }
}
