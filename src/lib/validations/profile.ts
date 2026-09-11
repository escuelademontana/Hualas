import { z } from 'zod';
import {
  MARITAL_STATUS_OPTIONS,
  normalizeMaritalStatus,
} from '@/lib/profile-options';

export const maritalStatusSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const normalized = normalizeMaritalStatus(value);
    return normalized;
  },
  z.union([z.enum(MARITAL_STATUS_OPTIONS), z.literal('')]).optional()
);

export const profileUpdateSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  dni: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),
  birthDate: z.string().optional(),
  gender: z
    .enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED', 'OTHER'])
    .optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: maritalStatusSchema,
  email: z.string().email().optional(),
  password: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(6).optional()
  ),
  allergies: z.string().optional(),
  regularMedication: z.string().optional(),
  relevantDiseases: z.string().optional(),
  previousInjuries: z.string().optional(),
  physicalRestrictions: z.string().optional(),
  bloodGroup: z.string().optional(),
  primaryDoctor: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorCertificate: z.string().optional(),
  socialFeeActive: z.literal(false).optional(),
});
