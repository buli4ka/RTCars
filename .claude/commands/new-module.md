---
description: Scaffold a new NestJS module with module/controller/service/dto files. Pass the module name in kebab-case (e.g. /new-module auction-results).
allowed-tools: Write Bash(mkdir *)
---

Create a new NestJS module for: **$ARGUMENTS**

Derive names from the argument:
- kebab-case: `$ARGUMENTS` (e.g. `auction-results`)
- PascalCase: e.g. `AuctionResults`
- camelCase: e.g. `auctionResults`

## Files to create in `backend/src/$ARGUMENTS/`

**`$ARGUMENTS.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { $ARGUMENTSPascalController } from './$ARGUMENTS.controller';
import { $ARGUMENTSPascalService } from './$ARGUMENTS.service';

@Module({
  controllers: [$ARGUMENTSPascalController],
  providers: [$ARGUMENTSPascalService],
  exports: [$ARGUMENTSPascalService],
})
export class $ARGUMENTSPascalModule {}
```

**`$ARGUMENTS.controller.ts`**
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { $ARGUMENTSPascalService } from './$ARGUMENTS.service';

@ApiTags('$ARGUMENTS')
@Controller('$ARGUMENTS')
export class $ARGUMENTSPascalController {
  constructor(private readonly $ARGUMENTSCamelService: $ARGUMENTSPascalService) {}

  @Get()
  @ApiOperation({ summary: 'TODO: describe this endpoint' })
  findAll() {
    return this.$ARGUMENTSCamelService.findAll();
  }
}
```

**`$ARGUMENTS.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class $ARGUMENTSPascalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // TODO: implement
    return [];
  }
}
```

**`dto/$ARGUMENTS-query.dto.ts`**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class $ARGUMENTSPascalQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;
}
```

## After creating files

Remind to import the new module in `backend/src/app.module.ts`:
```typescript
import { $ARGUMENTSPascalModule } from './$ARGUMENTS/$ARGUMENTS.module';

@Module({
  imports: [
    // existing modules...
    $ARGUMENTSPascalModule,
  ],
})
export class AppModule {}
```
