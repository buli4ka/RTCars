import { type ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  it.each([
    ['P2002', HttpStatus.CONFLICT],
    ['P2025', HttpStatus.NOT_FOUND],
    ['P2003', HttpStatus.BAD_REQUEST],
    ['P2000', HttpStatus.BAD_REQUEST],
    ['P9999', HttpStatus.INTERNAL_SERVER_ERROR],
  ])('maps %s -> %i', (code, expected) => {
    const { host, status, json } = makeHost();

    filter.catch(prismaError(code), host);

    expect(status).toHaveBeenCalledWith(expected);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: expected, error: HttpStatus[expected] }),
    );
  });

  it('includes the conflicting field for P2002', () => {
    const { host, json } = makeHost();

    filter.catch(prismaError('P2002', { target: ['email'] }), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('email') }),
    );
  });
});
