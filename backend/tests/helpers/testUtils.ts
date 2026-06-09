import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase } from '../__mocks__/database';

export const createMockConnection = (overrides: {
  executeFn?: (sql: string, params?: any[]) => Promise<[ResultSetHeader]>;
} = {}) => {
  const defaultExecuteResult: [ResultSetHeader] = [{ affectedRows: 1, insertId: 1 } as ResultSetHeader];
  const mockExecute = overrides.executeFn || jest.fn().mockResolvedValue(defaultExecuteResult);
  const mockCommit = jest.fn().mockResolvedValue(undefined);
  const mockRollback = jest.fn().mockResolvedValue(undefined);
  const mockRelease = jest.fn();
  const mockBeginTransaction = jest.fn().mockResolvedValue(undefined);

  const connection = {
    execute: mockExecute,
    commit: mockCommit,
    rollback: mockRollback,
    release: mockRelease,
    beginTransaction: mockBeginTransaction,
  };

  return { connection, mockExecute, mockCommit, mockRollback, mockRelease, mockBeginTransaction };
};

export const createRowPacket = <T>(data: T): T & RowDataPacket => {
  return data as T & RowDataPacket;
};

export const createResultHeader = (overrides: Partial<ResultSetHeader> = {}): ResultSetHeader => {
  return {
    affectedRows: 1,
    insertId: 1,
    fieldCount: 0,
    info: '',
    ...overrides,
  } as ResultSetHeader;
};

export { setMockQuery, setMockExecute, setMockGetConnection, resetMockDatabase };
