import { COUNTRIES } from '@/lib/countries';
import {
  MARITAL_STATUS_OPTIONS,
  toMaritalStatusOption,
} from '@/lib/profile-options';
import { profileUpdateSchema } from '@/lib/validations/profile';

describe('profile options', () => {
  it('provides searchable countries with flags', () => {
    const argentina = COUNTRIES.find((country) => country.code === 'AR');

    expect(argentina).toEqual(
      expect.objectContaining({
        name: 'Argentina',
        flag: '🇦🇷',
        flagUrl: 'https://flagcdn.com/w40/ar.png',
      })
    );
    expect(COUNTRIES.length).toBeGreaterThan(190);
  });

  it('accepts only the configured marital statuses and normalizes legacy values', () => {
    expect(MARITAL_STATUS_OPTIONS).toEqual([
      'Soltera/o',
      'Casada/o',
      'Divorciada/o',
      'Viuda/o',
    ]);
    expect(
      profileUpdateSchema.parse({ maritalStatus: 'Soltera' }).maritalStatus
    ).toBe('Soltera/o');
    expect(
      profileUpdateSchema.safeParse({ maritalStatus: 'En pareja' }).success
    ).toBe(false);
    expect(toMaritalStatusOption('En pareja')).toBe('');
    expect(profileUpdateSchema.parse({ maritalStatus: '' }).maritalStatus).toBe(
      ''
    );
  });
});
