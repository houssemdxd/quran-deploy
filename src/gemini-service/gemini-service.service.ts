/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('❌ GEMINI_API_KEY is missing in environment variables');
}
this.genAI = new GoogleGenerativeAI(apiKey);
  }
async analyzeVideo(file: Express.Multer.File): Promise<string> {
  // Directly use buffer provided by Multer
  const fileBuffer = file.buffer;

  const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const response = await model.generateContent([
    {
      inlineData: {
        mimeType: file.mimetype,
        data: fileBuffer.toString('base64'),
      },
    },
    { text:'You are a content moderator for a Quran mobile app. Analyze the uploaded video carefully. Rules:1. The video must be religious (e.g., Quran recitation, Tilawa, lectures, Islamic content). 2. If the video contains any harmful, inappropriate, or non-religious content, respond with only the word "inappropriate".3. If the video is religious and appropriate according to the above rules, respond with only the word "appropriate".4. Do not return anything else. Even if the video is appropriate but not religious, return "inappropriate".Only return "appropriate" or "inappropriate".'},
  ]);

  const candidates = response.response?.candidates;
  if (!candidates || candidates.length === 0) {
    return 'No analysis result';
  }
console.log("0000"+candidates[0].content?.parts?.[0]?.text)
  return candidates[0].content?.parts?.[0]?.text ?? 'No analysis result';
}
}