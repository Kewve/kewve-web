import { NextRequest, NextResponse } from 'next/server';
import { createBuyerProducerUpgradeStripeSession } from '@/lib/buyerProducerStripe';

const getApiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const meRes = await fetch(`${getApiBase()}/auth/me`, {
      headers: { Authorization: authHeader },
    });
    const meData = await meRes.json();

    if (!meRes.ok || !meData.success || !meData.data?.user) {
      return NextResponse.json({ success: false, message: 'Could not verify your session.' }, { status: 401 });
    }

    const user = meData.data.user as { id: string; email: string; role?: string; roles?: string[] };
    const roles =
      Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles.map((r) => String(r).toLowerCase())
        : [String(user.role || 'producer').toLowerCase()];
    if (!roles.includes('buyer')) {
      return NextResponse.json({ success: false, message: 'Buyer access is required for this checkout.' }, { status: 403 });
    }
    if (roles.includes('producer')) {
      return NextResponse.json(
        { success: false, message: 'You already have producer access. Open the producer dashboard.' },
        { status: 400 }
      );
    }

    let body: { discountCode?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await createBuyerProducerUpgradeStripeSession({
      buyerId: user.id,
      buyerEmail: user.email,
      discountCode: body.discountCode,
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { url: result.url } });
  } catch (e) {
    console.error('buyer-producer-checkout:', e);
    return NextResponse.json({ success: false, message: 'Unable to start checkout.' }, { status: 500 });
  }
}
