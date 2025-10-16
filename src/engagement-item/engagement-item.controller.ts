import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { EngagementItemService } from './engagement-item.service';
import { CreateEngagementItemDto } from './dto/create-engagement-item.dto';
import { UpdateEngagementItemDto } from './dto/update-engagement-item.dto';

@Controller('engagement-items')
export class EngagementItemController {
  constructor(private readonly engagementItemService: EngagementItemService) {}

  @Post()
  async create(@Body() dto: CreateEngagementItemDto) {
    try {
      const id = await this.engagementItemService.createEngagementItem(dto);
      return { message: 'EngagementItem created successfully', id };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  async findAll() {
    return await this.engagementItemService.getAllEngagementItems();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.engagementItemService.getEngagementItemById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEngagementItemDto) {
    await this.engagementItemService.updateEngagementItem(id, dto);
    return { message: 'EngagementItem updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.engagementItemService.deleteEngagementItem(id);
    return { message: 'EngagementItem deleted successfully' };
  }
}
