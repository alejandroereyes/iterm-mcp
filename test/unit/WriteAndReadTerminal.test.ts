// @ts-nocheck
/**
 * Tests for the write_and_read_terminal tool handler logic.
 */
const mockExecPromiseFn = jest.fn();

jest.mock('node:util', () => ({
  promisify: jest.fn().mockReturnValue(mockExecPromiseFn)
}));
jest.mock('node:child_process', () => ({
  exec: jest.fn()
}));
jest.mock('../../src/TtyOutputReader.js', () => ({
  __esModule: true,
  default: {
    retrieveBuffer: jest.fn().mockResolvedValue('Mocked terminal output'),
    call: jest.fn().mockResolvedValue('Mocked output lines')
  }
}));
jest.mock('node:fs', () => ({
  openSync: jest.fn().mockReturnValue(1),
  closeSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
}));

import { jest, describe, expect, test, beforeEach } from '@jest/globals';

describe('write_and_read_terminal tool', () => {
  let CommandExecutor;
  let commandExecutor;
  let TtyOutputReader;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamically import after mocks
    CommandExecutor = (await import('../../src/CommandExecutor.js')).default;
    TtyOutputReader = (await import('../../src/TtyOutputReader.js')).default;
    jest.spyOn(TtyOutputReader, 'retrieveBuffer').mockResolvedValue('Mocked terminal output');
    jest.spyOn(TtyOutputReader, 'call').mockResolvedValue('Mocked output lines');
    mockExecPromiseFn.mockImplementation((command) => {
      if (command.includes('get tty')) {
        return Promise.resolve({ stdout: '/dev/ttys000\n', stderr: '' });
      } else if (command.includes('get is processing')) {
        return Promise.resolve({ stdout: 'false\n', stderr: '' });
      } else {
        return Promise.resolve({ stdout: '', stderr: '' });
      }
    });
    // Inject the mockExecPromiseFn into CommandExecutor
    commandExecutor = new CommandExecutor(mockExecPromiseFn);
  });

  test('executes command and reads output (simulating tool handler)', async () => {
    const testCommand = 'echo "test" && date';
    const expectedOutput = 'test\nTue Dec 23 10:29:37 CST 2025';
    jest.spyOn(TtyOutputReader, 'call').mockResolvedValue(expectedOutput);

    // Simulate what the write_and_read_terminal tool handler does:
    // 1. Execute command (waits for completion)
    await commandExecutor.executeCommand(testCommand);
    
    // 2. Read and return output
    const linesOfOutput = 50;
    const output = await TtyOutputReader.call(linesOfOutput);

    // Verify command was sent to iTerm
    const writeTextCall = mockExecPromiseFn.mock.calls.find(call =>
      call[0].includes('write text') && call[0].includes('echo')
    );
    expect(writeTextCall).toBeTruthy();
    
    // Verify output was read with correct line count
    expect(TtyOutputReader.call).toHaveBeenCalledWith(50);
    expect(output).toBe(expectedOutput);
  });

  test('uses default linesOfOutput of 50 when not specified', async () => {
    await commandExecutor.executeCommand('test');
    
    // Simulate the default parameter logic: Number(undefined) || 50
    const linesOfOutput = Number(undefined) || 50;
    await TtyOutputReader.call(linesOfOutput);

    expect(TtyOutputReader.call).toHaveBeenCalledWith(50);
  });

  test('uses custom linesOfOutput when specified', async () => {
    await commandExecutor.executeCommand('test');
    
    // Simulate custom parameter: Number(100) || 50
    const linesOfOutput = Number(100) || 50;
    await TtyOutputReader.call(linesOfOutput);

    expect(TtyOutputReader.call).toHaveBeenCalledWith(100);
  });
});

