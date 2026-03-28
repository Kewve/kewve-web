import { NextRequest, NextResponse } from 'next/server';
import { sendProducerRejectionEmail } from '@/actions/producerNotifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await sendProducerRejectionEmail({
      producerEmail: body?.producerEmail,
      producerName: body?.producerName,
      itemType: body?.itemType,
      itemName: body?.itemName,
      reason: body?.reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email notification.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process email request.' },
      { status: 500 }
    );
  }
}

