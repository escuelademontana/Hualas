export const MARITAL_STATUS_OPTIONS = [
  'Soltera/o',
  'Casada/o',
  'Divorciada/o',
  'Viuda/o',
] as const;

const LEGACY_MARITAL_STATUS: Record<
  string,
  (typeof MARITAL_STATUS_OPTIONS)[number]
> = {
  Soltera: 'Soltera/o',
  Casada: 'Casada/o',
  Divorciada: 'Divorciada/o',
  Viuda: 'Viuda/o',
};

export function normalizeMaritalStatus(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return LEGACY_MARITAL_STATUS[normalized] ?? normalized;
}

export function toMaritalStatusOption(
  value: string | null | undefined
): (typeof MARITAL_STATUS_OPTIONS)[number] | '' {
  const normalized = normalizeMaritalStatus(value);
  return (MARITAL_STATUS_OPTIONS as readonly string[]).includes(normalized)
    ? (normalized as (typeof MARITAL_STATUS_OPTIONS)[number])
    : '';
}
