import type { FormFieldSpec, FormTemplateId, Opportunity, UserProfile } from './types';

/** Identity fields every template collects. */
export const BASE_FORM_FIELDS: FormFieldSpec[] = [
  { key: 'firstName', label: 'First name', type: 'text', required: true },
  { key: 'lastName', label: 'Last name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'addressLine1', label: 'Street address', type: 'text', required: true },
  { key: 'addressLine2', label: 'Apt / unit', type: 'text' },
  { key: 'city', label: 'City', type: 'text', required: true },
  { key: 'state', label: 'State / province', type: 'text', required: true },
  { key: 'postalCode', label: 'ZIP / postal code', type: 'text', required: true },
  { key: 'country', label: 'Country', type: 'text', required: true },
];

/** Template-specific fields, appended after BASE_FORM_FIELDS and any opportunity.extraFields. */
export const TEMPLATE_FIELDS: Record<FormTemplateId, FormFieldSpec[]> = {
  settlement_claim: [
    {
      key: 'accountIdentifier',
      label: 'Account email or username used with the company',
      type: 'text',
      required: true,
    },
    { key: 'periodStart', label: 'Approx. date you first used the service', type: 'date' },
    { key: 'statement', label: 'Anything else the administrator should know', type: 'multiline' },
  ],
  refund_request: [
    { key: 'orderNumber', label: 'Order / transaction number', type: 'text', required: true },
    { key: 'purchaseDate', label: 'Purchase date', type: 'date', required: true },
    { key: 'amountPaid', label: 'Amount paid (USD)', type: 'number', required: true },
    { key: 'reason', label: 'Why you are requesting a refund', type: 'multiline', required: true },
  ],
  con_refund_request: [
    { key: 'eventName', label: 'Convention name', type: 'text', required: true },
    { key: 'orderNumber', label: 'Badge / ticket order number', type: 'text', required: true },
    { key: 'amountPaid', label: 'Amount paid (USD)', type: 'number', required: true },
    { key: 'reason', label: 'Reason (cancelled, rescheduled, unable to attend)', type: 'multiline' },
  ],
  travel_compensation: [
    { key: 'carrier', label: 'Airline / carrier', type: 'text', required: true },
    { key: 'bookingReference', label: 'Booking reference', type: 'text', required: true },
    { key: 'travelDate', label: 'Travel date', type: 'date', required: true },
    {
      key: 'issue',
      label: 'What went wrong',
      type: 'select',
      options: ['Delayed 3+ hours', 'Cancelled', 'Lost or damaged baggage', 'Denied boarding'],
      required: true,
    },
    { key: 'details', label: 'Details (props, wigs, costume pieces affected, etc.)', type: 'multiline' },
  ],
  commission_dispute: [
    { key: 'sellerName', label: 'Commissioner / shop name', type: 'text', required: true },
    { key: 'platform', label: 'Platform used to pay', type: 'text', required: true },
    { key: 'orderNumber', label: 'Order / invoice number', type: 'text' },
    { key: 'amountPaid', label: 'Amount paid (USD)', type: 'number', required: true },
    { key: 'promisedDate', label: 'Promised delivery date', type: 'date', required: true },
    { key: 'details', label: 'Timeline of what happened', type: 'multiline', required: true },
  ],
  generic_request: [
    { key: 'reference', label: 'Reference / order number', type: 'text' },
    { key: 'details', label: 'Details of your request', type: 'multiline', required: true },
  ],
};

export function fieldsForOpportunity(o: Opportunity): FormFieldSpec[] {
  return [...BASE_FORM_FIELDS, ...(o.extraFields ?? []), ...TEMPLATE_FIELDS[o.formTemplateId]];
}

/** Pre-fill form values from the profile. Only string values are copied. */
export function prefillFromProfile(fields: FormFieldSpec[], profile: UserProfile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = profile[f.key];
    if (typeof v === 'string') out[f.key] = v;
    else if (typeof v === 'number') out[f.key] = String(v);
  }
  return out;
}

export function missingRequiredFields(fields: FormFieldSpec[], values: Record<string, string>): FormFieldSpec[] {
  return fields.filter((f) => f.required && !(values[f.key] ?? '').trim());
}

const TEMPLATE_TITLE: Record<FormTemplateId, string> = {
  settlement_claim: 'Settlement Claim Form',
  refund_request: 'Refund Request',
  con_refund_request: 'Convention Refund Request',
  travel_compensation: 'Travel Compensation Claim',
  commission_dispute: 'Commission Dispute Notice',
  generic_request: 'Request Letter',
};

export function formTitle(o: Pick<Opportunity, 'formTemplateId' | 'title'>): string {
  return `${TEMPLATE_TITLE[o.formTemplateId]} — ${o.title}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function body(templateId: FormTemplateId, o: Opportunity, v: Record<string, string>): string {
  const name = `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim();
  switch (templateId) {
    case 'settlement_claim':
      return `<p>I, ${esc(name)}, submit this claim in connection with <strong>${esc(o.title)}</strong> (${esc(o.company)}).</p>
<p>I used the service under the account <strong>${esc(v.accountIdentifier ?? '')}</strong>${v.periodStart ? ` since approximately ${esc(v.periodStart)}` : ''}. I believe I am a member of the settlement class as described: ${esc(o.whoQualifies)}</p>
${v.statement ? `<p>${esc(v.statement)}</p>` : ''}
<p>I declare under penalty of perjury that the information provided in this claim form is true and correct to the best of my knowledge.</p>`;
    case 'refund_request':
      return `<p>To ${esc(o.company)},</p>
<p>I am requesting a refund of <strong>$${esc(v.amountPaid ?? '')}</strong> for order <strong>${esc(v.orderNumber ?? '')}</strong> placed on ${esc(v.purchaseDate ?? '')}.</p>
<p>Reason: ${esc(v.reason ?? '')}</p>
<p>Please process the refund to the original payment method and confirm by email at ${esc(v.email ?? '')}.</p>`;
    case 'con_refund_request':
      return `<p>To the ${esc(v.eventName ?? o.company)} registration team,</p>
<p>I am requesting a refund of <strong>$${esc(v.amountPaid ?? '')}</strong> for badge/ticket order <strong>${esc(v.orderNumber ?? '')}</strong>.</p>
${v.reason ? `<p>Reason: ${esc(v.reason)}</p>` : ''}
<p>Per your published refund policy, please confirm the refund to my original payment method. I can be reached at ${esc(v.email ?? '')}.</p>`;
    case 'travel_compensation':
      return `<p>To ${esc(v.carrier ?? o.company)} Customer Relations,</p>
<p>Booking reference <strong>${esc(v.bookingReference ?? '')}</strong>, travel date ${esc(v.travelDate ?? '')}. Issue: <strong>${esc(v.issue ?? '')}</strong>.</p>
${v.details ? `<p>${esc(v.details)}</p>` : ''}
<p>I am requesting the refund and/or compensation I am entitled to under applicable passenger-rights rules and your contract of carriage. Please respond in writing to ${esc(v.email ?? '')}.</p>`;
    case 'commission_dispute':
      return `<p>To ${esc(v.sellerName ?? '')} (via ${esc(v.platform ?? '')}),</p>
<p>On ${esc(v.promisedDate ?? '')} you agreed to deliver a commissioned item for which I paid <strong>$${esc(v.amountPaid ?? '')}</strong>${v.orderNumber ? ` (order ${esc(v.orderNumber)})` : ''}. The item has not been delivered as agreed.</p>
<p>Timeline: ${esc(v.details ?? '')}</p>
<p>Please deliver the item or issue a full refund within 14 days of this notice. If I do not hear back, I will open a dispute with the payment provider.</p>`;
    case 'generic_request':
    default:
      return `<p>To ${esc(o.company)},</p>
${v.reference ? `<p>Reference: ${esc(v.reference)}</p>` : ''}
<p>${esc(v.details ?? '')}</p>`;
  }
}

/** Render a print-ready HTML document for the claim. Pure: safe to unit test. */
export function renderFormHtml(o: Opportunity, values: Record<string, string>, createdAt: string): string {
  const v = values;
  const name = `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim();
  const address = [v.addressLine1, v.addressLine2, `${v.city ?? ''}, ${v.state ?? ''} ${v.postalCode ?? ''}`.trim(), v.country]
    .filter((line) => line && line.trim() && line.trim() !== ',')
    .map((line) => esc(line as string))
    .join('<br/>');
  const date = createdAt.slice(0, 10);
  const recipient = o.mailingAddress
    ? `<p><strong>To:</strong><br/>${esc(o.mailingAddress).replace(/\n/g, '<br/>')}</p>`
    : o.claimEmail
      ? `<p><strong>To:</strong> ${esc(o.claimEmail)}</p>`
      : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${esc(formTitle(o))}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 40px; line-height: 1.5; font-size: 14px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  .from { margin-bottom: 24px; }
  .sig { margin-top: 48px; }
  .line { display:inline-block; width: 260px; border-bottom: 1px solid #111; }
  .footer { margin-top: 40px; font-size: 11px; color: #777; }
</style></head>
<body>
<h1>${esc(formTitle(o))}</h1>
<div class="meta">Prepared ${esc(date)} with Fritter · Category: ${esc(o.category)}</div>
<div class="from"><strong>From:</strong><br/>${esc(name)}<br/>${address}<br/>${esc(v.email ?? '')}${v.phone ? `<br/>${esc(v.phone)}` : ''}</div>
${recipient}
${body(o.formTemplateId, o, v)}
<div class="sig">Signature: <span class="line"></span>&nbsp;&nbsp; Date: <span class="line" style="width:120px"></span></div>
<div class="footer">This document was prepared by the user with a template. Fritter is not a law firm and does not provide legal advice. Verify requirements with the official administrator before submitting.${o.sourceUrl ? ` Source: ${esc(o.sourceUrl)}` : ''}</div>
</body></html>`;
}
