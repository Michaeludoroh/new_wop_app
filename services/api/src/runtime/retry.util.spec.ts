import { withRetry } from './retry.util';

describe('withRetry', () => {
  it('returns on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, 3, 1)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds', async () => {
    let count = 0;
    const fn = jest.fn().mockImplementation(async () => {
      count += 1;
      if (count < 3) {
        throw new Error('fail');
      }
      return 'done';
    });

    await expect(withRetry(fn, 5, 1)).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always-fail'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('always-fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
