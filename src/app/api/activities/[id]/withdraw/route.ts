import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { withdrawActivityParticipant } from '@/lib/activity-withdrawal';

const withdrawalSchema = z.object({
  participantId: z.string().min(1),
  note: z.string().trim().min(50, 'La nota debe tener al menos 50 caracteres.'),
  rating: z.number().int().min(0).max(5),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof withdrawalSchema>;
  try {
    payload = withdrawalSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  let participant;
  try {
    participant = await withdrawActivityParticipant({
      activityId: params.id,
      participantId: payload.participantId,
      userId: session.user.id,
      note: payload.note,
      rating: payload.rating,
    });
  } catch (error) {
    console.error('[activity-withdrawal] failed', {
      activityId: params.id,
      participantId: payload.participantId,
      userId: session.user.id,
      error,
    });
    return NextResponse.json(
      { error: 'No se pudo registrar la baja. Intentá nuevamente.' },
      { status: 500 }
    );
  }

  if (!participant) {
    return NextResponse.json(
      { error: 'No se encontró una inscripción activa para dar de baja.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    participant,
  });
}
