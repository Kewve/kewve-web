import { NextRequest, NextResponse } from 'next/server';
import { displayIdSuffix } from '@/lib/mongoId';
import { sendEmail } from '@/utils/emailConfig';

type AdminNotifyEventType =
  | 'registration_completed'
  | 'assessment_completed'
  | 'document_uploaded'
  | 'product_submitted';

// Buyer / trade operations
type AdminNotifyEventTypeExtended =
  | AdminNotifyEventType
  | 'buyer_request_submitted'
  | 'trade_payment_recorded'
  | 'trade_receipt_submitted'
  | 'trade_issue_reported'
  | 'cluster_checkout_paid';

function safeString(v: unknown): string {
  if (typeof v === 'string') return escapeHtml(v);
  if (v === null || v === undefined) return '';
  return escapeHtml(String(v));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeEscapedString(v: unknown): string {
  return safeString(v);
}

function buildAdminHtml(eventType: AdminNotifyEventTypeExtended, payload: Record<string, any>) {
  const titleByType: Record<AdminNotifyEventTypeExtended, string> = {
    registration_completed: 'Registration completed',
    assessment_completed: 'Assessment completed',
    document_uploaded: 'New document submitted',
    product_submitted: 'New product submitted',
    buyer_request_submitted: 'Sourcing request submitted',
    trade_payment_recorded: 'Trade payment recorded',
    trade_receipt_submitted: 'Trade receipt submitted',
    trade_issue_reported: 'Trade issue reported',
    cluster_checkout_paid: 'Cluster payment received',
  };

  const common = `
    <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>User name:</strong> ${safeString(payload.userName || payload.name)}</p>
    <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>User email:</strong> ${safeString(payload.userEmail || payload.email)}</p>
  `;

  const details = (() => {
    switch (eventType) {
      case 'registration_completed':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Role:</strong> ${safeString(payload.userRole || payload.role)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Country:</strong> ${safeString(payload.country)}</p>
        `;
      case 'assessment_completed':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Country:</strong> ${safeString(payload.country)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Export destination:</strong> ${safeString(payload.exportDestination)}</p>
        `;
      case 'document_uploaded':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Document label:</strong> ${safeString(payload.documentLabel)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>File name:</strong> ${safeString(payload.fileName)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Category:</strong> ${safeString(payload.documentCategory)}</p>
        `;
      case 'product_submitted':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Product name:</strong> ${safeString(payload.productName)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Category:</strong> ${safeString(payload.category)}</p>
        `;
      case 'buyer_request_submitted':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Product:</strong> ${safeString(payload.productName)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Category:</strong> ${safeString(payload.category)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Volume:</strong> ${safeString(payload.volumeKg)} kg</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Market:</strong> ${safeString(payload.market)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Timeline:</strong> ${safeString(payload.timeline)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Country:</strong> ${safeString(payload.deliveryCountry || payload.country)}</p>
        `;
      case 'trade_payment_recorded':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Buyer request:</strong> ${safeString(
            payload.buyerRequestId
          )}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Product:</strong> ${safeString(payload.productName)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Market:</strong> ${safeString(payload.market)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Paid at:</strong> ${safeString(payload.paidAt)}</p>
        `;
      case 'trade_receipt_submitted':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Buyer request:</strong> ${safeString(displayIdSuffix(payload.buyerRequestId))}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Receipt:</strong> ${safeString(payload.receiptKind)}</p>
          ${payload.notes ? `<p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Notes:</strong> ${safeString(payload.notes)}</p>` : ''}
        `;
      case 'trade_issue_reported':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Buyer request:</strong> ${safeString(payload.buyerRequestId)}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Issue receipt:</strong> ${safeString(payload.receiptKind)}</p>
          ${payload.notes ? `<p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Notes:</strong> ${safeString(payload.notes)}</p>` : ''}
        `;
      case 'cluster_checkout_paid':
        return `
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Buyer cluster id:</strong> ${safeString(displayIdSuffix(payload.clusterId))}</p>
          <p style="margin: 0 0 6px; font-size: 15px; line-height: 1.6;"><strong>Checkout session:</strong> ${safeString(displayIdSuffix(payload.sessionId))}</p>
        `;
      default:
        return '';
    }
  })();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; color:#1a2e23;">
      <h2 style="margin: 0 0 16px;">${titleByType[eventType]}</h2>
      ${common}
      ${details}
      <p style="margin: 18px 0 0; font-size: 13px; line-height: 1.6; color:#666;">
        This email was generated automatically by Kewve.
      </p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body?.eventType as AdminNotifyEventTypeExtended | undefined;
    const payload = (body?.payload || {}) as Record<string, any>;

    if (
      !eventType ||
      ![
        'registration_completed',
        'assessment_completed',
        'document_uploaded',
        'product_submitted',
        'buyer_request_submitted',
        'trade_payment_recorded',
        'trade_receipt_submitted',
        'trade_issue_reported',
        'cluster_checkout_paid',
      ].includes(eventType)
    ) {
      return NextResponse.json({ success: false, message: 'Invalid eventType' }, { status: 400 });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
    if (!ADMIN_EMAIL) {
      return NextResponse.json({ success: false, message: 'ADMIN_EMAIL is not configured' }, { status: 500 });
    }

    const subjectMap: Record<AdminNotifyEventTypeExtended, string> = {
      registration_completed: 'Kewve: Registration completed',
      assessment_completed: 'Kewve: Assessment completed',
      document_uploaded: 'Kewve: Document submitted',
      product_submitted: 'Kewve: Product submitted',
      buyer_request_submitted: 'Kewve: Sourcing request submitted',
      trade_payment_recorded: 'Kewve: Trade payment recorded',
      trade_receipt_submitted: 'Kewve: Trade receipt submitted',
      trade_issue_reported: 'Kewve: Trade issue reported',
      cluster_checkout_paid: 'Kewve: Cluster payment received',
    };

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: subjectMap[eventType],
      html: buildAdminHtml(eventType, payload),
      attachFooterImage: false,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Admin notify failed' }, { status: 500 });
  }
}

