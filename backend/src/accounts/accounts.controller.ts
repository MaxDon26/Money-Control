import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  ParseRequisitesResultDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { RequisitesParser } from '../telegram/parsers/requisites.parser';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { PDFParse } = require('pdf-parse');

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly requisitesParser: RequisitesParser,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать счёт' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все счета' })
  findAll(@CurrentUser('id') userId: string) {
    return this.accountsService.findAll(userId);
  }

  @Get('total')
  @ApiOperation({ summary: 'Получить общий баланс' })
  getTotalBalance(@CurrentUser('id') userId: string) {
    return this.accountsService.getTotalBalance(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить счёт по ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.accountsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить счёт' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Архивировать счёт' })
  archive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.accountsService.archive(userId, id);
  }

  @Post('parse-requisites')
  @ApiOperation({ summary: 'Парсинг реквизитов счёта из PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF файл с реквизитами счёта',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.pdf$/i)) {
          return cb(
            new BadRequestException('Только PDF файлы поддерживаются'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async parseRequisites(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: UploadedFile,
  ): Promise<ParseRequisitesResultDto> {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pdfParser = new PDFParse({ data: file.buffer });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const pdfResult = await pdfParser.getText();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pdfParser.destroy();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const text: string = pdfResult.text as string;

    const result = this.requisitesParser.parse(text);

    if (!result) {
      throw new BadRequestException(
        'Не удалось распознать реквизиты. Поддерживаются: Сбербанк, Тинькофф',
      );
    }

    return result;
  }
}
