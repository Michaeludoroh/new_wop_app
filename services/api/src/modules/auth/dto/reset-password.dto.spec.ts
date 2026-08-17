import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

describe('ResetPasswordDto', () => {
  it('rejects passwords shorter than 8 characters', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'a'.repeat(32),
      newPassword: 'short',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'newPassword')).toBe(true);
  });

  it('accepts an 8-character password with a valid token', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'a'.repeat(32),
      newPassword: 'Pass1234',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
