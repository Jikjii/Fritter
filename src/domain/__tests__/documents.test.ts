import { fieldsForOpportunity, formTitle, htmlToPlainText, missingRequiredFields, prefillFromProfile, renderFormHtml } from '../documents';
import type { Opportunity } from '../types';

const o: Opportunity = {
  id: 'crunchy',
  title: 'Crunchyroll privacy settlement',
  company: 'Crunchyroll',
  category: 'settlement',
  summary: '',
  whoQualifies: 'Anyone with an account.',
  eligibility: [],
  estimatedPayoutMin: 10,
  estimatedPayoutMax: 30,
  deadline: 'rolling',
  proofRequired: '',
  claimMethod: 'mail_form',
  confidence: 'illustrative',
  confidenceNote: '',
  formTemplateId: 'settlement_claim',
  updatedAt: '2026-01-01',
  mailingAddress: 'Settlement Administrator\nPO Box 1\nSeattle, WA',
  extraFields: [{ key: 'planTier', label: 'Plan tier', type: 'select', options: ['Fan', 'Mega Fan'] }],
};

describe('documents', () => {
  it('builds the field list from base + extra + template fields', () => {
    const keys = fieldsForOpportunity(o).map((f) => f.key);
    expect(keys.slice(0, 2)).toEqual(['firstName', 'lastName']);
    expect(keys).toContain('planTier');
    expect(keys).toContain('accountIdentifier');
  });

  it('prefills string/number profile values only', () => {
    const v = prefillFromProfile(fieldsForOpportunity(o), { firstName: 'Rin', services: ['x'], consPerYear: 2, city: 'Osaka' });
    expect(v).toEqual({ firstName: 'Rin', city: 'Osaka' });
  });

  it('reports missing required fields', () => {
    const missing = missingRequiredFields(fieldsForOpportunity(o), { firstName: 'Rin', lastName: ' ' });
    expect(missing.map((f) => f.key)).toContain('lastName');
    expect(missing.map((f) => f.key)).not.toContain('firstName');
    expect(missing.map((f) => f.key)).not.toContain('phone');
  });

  it('renders escaped HTML with recipient, sender and disclaimer', () => {
    const html = renderFormHtml(
      o,
      { firstName: 'Rin', lastName: '<Tohsaka>', email: 'rin@example.com', addressLine1: '1 Fuyuki St', city: 'Fuyuki', state: 'HY', postalCode: '000', country: 'JP', accountIdentifier: 'rin@example.com' },
      '2026-09-17T10:00:00.000Z'
    );
    expect(html).toContain('&lt;Tohsaka&gt;');
    expect(html).not.toContain('<Tohsaka>');
    expect(html).toContain('Settlement Administrator<br/>PO Box 1');
    expect(html).toContain('Prepared 2026-09-17');
    expect(html).toContain('not a law firm');
    expect(html).toContain('penalty of perjury');
  });

  it('formTitle combines template and opportunity', () => {
    expect(formTitle(o)).toBe('Settlement Claim Form — Crunchyroll privacy settlement');
  });
});

describe('htmlToPlainText', () => {
  it('strips tags and decodes entities', () => {
    const text = htmlToPlainText('<html><head><style>p{}</style></head><body><h1>Hi &amp; bye</h1><p>Line<br/>two</p></body></html>');
    expect(text).toBe('Hi & bye\n\nLine\ntwo');
  });
});
