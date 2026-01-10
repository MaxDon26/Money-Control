import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ImportService } from './import.service';
import {
  ImportStatementDto,
  ImportResultDto,
  DetectAccountResultDto,
} from './dto';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('detect-account')
  @ApiOperation({
    summary: 'Определить счёт из выписки по номеру лицевого счёта',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл выписки (PDF или CSV)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv|pdf)$/i)) {
          return cb(
            new BadRequestException('Только CSV и PDF файлы поддерживаются'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async detectAccount(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: UploadedFile,
  ): Promise<DetectAccountResultDto> {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }
    return this.importService.detectAccount(userId, file);
  }

  @Post('statement')
  @ApiOperation({ summary: 'Импорт банковской выписки (PDF/CSV)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'accountId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл выписки (PDF или CSV)',
        },
        accountId: {
          type: 'string',
          format: 'uuid',
          description: 'ID счёта для импорта',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv|pdf)$/i)) {
          return cb(
            new BadRequestException('Только CSV и PDF файлы поддерживаются'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async importStatement(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: UploadedFile,
    @Body() dto: ImportStatementDto,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    return this.importService.importStatement(userId, dto.accountId, file);
  }
}
