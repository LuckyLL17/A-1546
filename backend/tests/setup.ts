import { ModuleMocker } from 'jest-mock';

const mocker = new ModuleMocker(global);

jest.mock('../src/utils/database', () => {
  const actual = require('../tests/__mocks__/database');
  return actual;
});

jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    request: jest.fn(),
    business: jest.fn(),
  },
  __esModule: true,
}));
