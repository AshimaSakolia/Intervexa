import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';

export const MAX_DB_INT = 2_147_483_647;

/** Parses a positive integer id; ids beyond the DB's Int range can't exist, so they 404. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('Validation failed (numeric id expected)');
    }
    const id = Number(value);
    if (id > MAX_DB_INT) {
      throw new NotFoundException();
    }
    return id;
  }
}
