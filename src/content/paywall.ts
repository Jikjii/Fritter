/**
 * Paywall copy. Two variants: the default when the reveal found money, and a zero-match
 * variant so users who matched nothing paying today are sold the Watchlist and the
 * evergreen con-life templates instead of "up to $0".
 *
 * Apple 3.1.2: price per period, trial → paid conversion, and Terms / Privacy links are
 * rendered by the screen itself from the live store plans, never hard-coded here.
 */
export const PAYWALL = {
  headline: 'Unlock every claim. Less than one settlement check per year.',
  bullets: [
    'Your full list: every verified settlement, refund and credit program for anime, gaming, merch and con fans, with a source link on every card',
    'Claim Kit: autofilled forms, print-ready PDFs and dispute letters, ready in three taps',
    'Watchlist alerts the day Crunchyroll, Hot Topic or Nintendo claims open, plus a reminder before any deadline closes',
    'Wallet that tracks every claim, credit and dispute window until the money lands',
    'Con-life claims Payout apps don’t have: lost prop bags, cancelled con badges, ghosted commissions, late figure preorders',
  ],
  yearlyAnchorCopy:
    'Most fans pick yearly: about $2.50 a month, less than one settlement check. Free trial first, cancel anytime.',
  socialProofLine:
    'Google’s $630M Play Store fund is paying about 102 million people. Money like this only reaches people who show up.',
};

export const PAYWALL_ZERO_MATCH = {
  headline: 'Nothing is paying you today. Be first when it does.',
  bullets: [
    'Watchlist alerts the day a program you match opens claims (Crunchyroll, Hot Topic and Nintendo cases are all pending)',
    'Con-life Claim Kit: lost prop bags, cancelled con badges, ghosted commissions, late figure preorders, ready-to-send',
    'Marketplace refund guides for Steam, Etsy, eBay and Amazon that most fans never use',
    'Wallet that tracks every dispute window so you never miss the 180-day PayPal or 60-day card deadline again',
  ],
  yearlyAnchorCopy: 'Most fans pick yearly: about $2.50 a month. Free trial first, cancel anytime.',
  socialProofLine: 'Crunchyroll paid about $30 to every fan who filed in 2023. Most never did.',
};
