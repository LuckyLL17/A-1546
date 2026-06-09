import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

type QueryFn = <T extends RowDataPacket>(sql: string, params?: any[]) => Promise<T[]>;
type ExecuteFn = (sql: string, params?: any[]) => Promise<ResultSetHeader>;

let mockQueryFn: QueryFn = async () => [] as any;
let mockExecuteFn: ExecuteFn = async () => ({ affectedRows: 1, insertId: 1 } as ResultSetHeader);
let mockGetConnectionFn: () => Promise<PoolConnection> = async () => null as any;

export const setMockQuery = (fn: QueryFn) => { mockQueryFn = fn; };
export const setMockExecute = (fn: ExecuteFn) => { mockExecuteFn = fn; };
export const setMockGetConnection = (fn: () => Promise<PoolConnection>) => { mockGetConnectionFn = fn; };
export const resetMockDatabase = () => {
  mockQueryFn = async () => [] as any;
  mockExecuteFn = async () => ({ affectedRows: 1, insertId: 1 } as ResultSetHeader);
};

export const initDatabase = (): Pool => ({}) as Pool;
export const getPool = (): Pool => ({}) as Pool;

export const getConnection = async (): Promise<PoolConnection> => {
  return mockGetConnectionFn();
};

export const query = async <T extends RowDataPacket>(sql: string, params?: any[]): Promise<T[]> => {
  return mockQueryFn<T>(sql, params);
};

export const execute = async (sql: string, params?: any[]): Promise<ResultSetHeader> => {
  return mockExecuteFn(sql, params);
};

export const closeDatabase = async (): Promise<void> => {};
