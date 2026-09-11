import { z } from 'zod';

export const savedLocationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Completá el nombre del lugar'),
  description: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
