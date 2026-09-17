import type { OnboardingScreen } from '@/domain/types';

/**
 * The onboarding script. Order matters: the step index is the route param.
 *
 * Follows the Payout playbook beat for beat: emotional hook → personalization questions
 * (each one sets a profileKey the catalog's eligibility rules read) → "scanning" loader →
 * personalized reveal with a chart → real-numbers chart → social proof → notifications → paywall.
 *
 * Every number in copy below comes from a catalog item or a sourced fact in social-proof.ts.
 * Screens with `showIf` are skipped when the rule fails against the answers so far.
 */
export const ONBOARDING_SCREENS: OnboardingScreen[] = [
  {
    id: 'hook_1',
    type: 'hook',
    title: 'Crunchyroll settled for $16,000,000.',
    subtitle:
      'Fans who filed got about $30 each. Crunchyroll is being sued again right now. This time, don’t miss it.',
    cta: 'Show me what I’m owed',
    notes: 'emoji:⚖️',
  },
  {
    id: 'hook_2',
    type: 'hook',
    title: 'You paid for the sub. The figures. The badge. The flight.',
    subtitle:
      'Companies settle for millions, airlines owe you by law, and most fans never file. Fritter finds the claim, fills the form, and tracks the check.',
    cta: 'Check my claims',
    notes: 'emoji:💸',
    options: [
      {
        label: 'PlayStation Store',
        value: 'Up to $33.66 in PSN credit, automatic (2026 settlement)',
        emoji: '🎮',
        sourceUrl: 'https://psndigitalgamessettlement.com/home/',
      },
      {
        label: 'Amazon Prime',
        value: 'Refunds up to $200 if you receive a claim notice (FTC)',
        emoji: '📦',
        sourceUrl: 'https://www.ftc.gov/enforcement/refunds/amazon-refunds',
      },
      {
        label: 'Lost prop or wig bag (US flight)',
        value: 'Airlines liable up to $4,700 (DOT)',
        emoji: '🧳',
        sourceUrl: 'https://www.transportation.gov/lost-delayed-or-damaged-baggage',
      },
    ],
  },
  {
    id: 'q_fantype',
    type: 'multiQuestion',
    title: 'What kind of fan are you?',
    subtitle: 'Pick everything that applies. This personalizes your feed.',
    profileKey: 'fanType',
    options: [
      { label: 'Anime watcher', value: 'anime', emoji: '📺' },
      { label: 'Manga reader', value: 'manga', emoji: '📚' },
      { label: 'Gamer (console / PC / mobile)', value: 'gaming', emoji: '🎮' },
      { label: 'Figure & merch collector', value: 'figures', emoji: '🗿' },
      { label: 'Cosplayer', value: 'cosplay', emoji: '🧵' },
      { label: 'TCG collector (Pokémon, One Piece…)', value: 'tcg', emoji: '🃏' },
      { label: 'Streamer / content creator', value: 'streamer', emoji: '🎥' },
    ],
  },
  {
    id: 'q_country',
    type: 'question',
    title: 'Where do you live?',
    subtitle: 'Settlements and passenger rights are country-specific.',
    profileKey: 'country',
    options: [
      { label: 'United States', value: 'us', emoji: '🇺🇸' },
      { label: 'United Kingdom', value: 'uk', emoji: '🇬🇧' },
      { label: 'Canada', value: 'ca', emoji: '🇨🇦' },
      { label: 'EU (France, Germany, etc.)', value: 'eu', emoji: '🇪🇺' },
      { label: 'Somewhere else', value: 'other', emoji: '🌏' },
    ],
  },
  {
    id: 'q_services',
    type: 'multiQuestion',
    title: 'Which of these have you EVER had an account with?',
    subtitle: 'Old accounts count. Settlements usually reach back 4–6 years.',
    profileKey: 'services',
    options: [
      { label: 'Crunchyroll', value: 'crunchyroll', emoji: '🍙' },
      { label: 'Funimation (before the 2024 shutdown)', value: 'funimation_legacy', emoji: '🎞️' },
      { label: 'PlayStation Network', value: 'playstation', emoji: '🎮' },
      { label: 'Nintendo Account / eShop', value: 'nintendo', emoji: '🍄' },
      { label: 'Google Play (Android)', value: 'google_play', emoji: '🤖' },
      { label: 'Steam', value: 'steam', emoji: '💨' },
      { label: 'Twitch', value: 'twitch', emoji: '🟣' },
      { label: 'Patreon', value: 'patreon', emoji: '🧡' },
      { label: 'Amazon Prime', value: 'amazon_prime', emoji: '📦' },
      { label: 'None of these', value: 'none' },
    ],
  },
  {
    id: 'q_amazon_notice',
    type: 'question',
    title: 'Did Amazon send you a Prime refund claim notice?',
    subtitle:
      'Under the FTC settlement Amazon emails or mails notices to members it owes. Search your inbox for “Amazon Prime settlement”. Real notices never ask for a fee.',
    profileKey: 'amazonClaimNotice',
    showIf: { profileKey: 'services', operator: 'includes', value: 'amazon_prime' },
    options: [
      { label: 'Yes', value: 'yes', emoji: '📬' },
      { label: 'No', value: 'no' },
      { label: 'Not sure — I’ll check', value: 'unsure', emoji: '🔎' },
    ],
  },
  {
    id: 'q_shops',
    type: 'multiQuestion',
    title: 'Where do you buy merch, games and tickets?',
    subtitle:
      'Retailers get breached and sued too, and every marketplace has a refund guarantee most people never use.',
    profileKey: 'shops',
    options: [
      { label: 'Hot Topic / BoxLunch / Torrid', value: 'hot_topic_boxlunch', emoji: '🖤' },
      { label: 'GameStop.com', value: 'gamestop', emoji: '🕹️' },
      { label: 'Good Smile US / figure preorder shops', value: 'figure_shops', emoji: '🗿' },
      { label: 'Etsy (commissions, prints, cosplay pieces)', value: 'etsy', emoji: '🧶' },
      { label: 'Amazon', value: 'amazon', emoji: '📦' },
      { label: 'eBay / Mercari', value: 'resale', emoji: '🏷️' },
      { label: 'None of these', value: 'none' },
    ],
  },
  {
    id: 'q_purchases',
    type: 'multiQuestion',
    title: 'Any of these apply to you?',
    subtitle: 'Each one maps to a specific open, automatic, or pending program.',
    profileKey: 'purchases',
    options: [
      {
        label: 'Bought digital games on PlayStation Store 2019–2023',
        value: 'psn_digital_2019_2023',
        emoji: '🎮',
      },
      {
        label: 'Made Google Play purchases 2016–2023 (gacha, apps, subs)',
        value: 'play_purchases_2016_2023',
        emoji: '🤖',
      },
      { label: 'Owned Ubisoft’s The Crew (2014)', value: 'the_crew', emoji: '🏎️' },
      {
        label: 'Bought a Switch 2, Switch or Nintendo accessory in 2025–26',
        value: 'nintendo_hardware_2025',
        emoji: '🍄',
      },
      { label: 'Own Joy-Con controllers with stick drift', value: 'joycon_drift', emoji: '🕹️' },
      {
        label: 'Bought anime discs with a Funimation digital copy',
        value: 'funimation_digital_copy',
        emoji: '💿',
      },
      { label: 'None of these', value: 'none' },
    ],
  },
  {
    id: 'q_con_life',
    type: 'multiQuestion',
    title: 'Has con life ever cost you money you never got back?',
    subtitle: 'Be honest. We’ve all been there.',
    profileKey: 'conMishaps',
    options: [
      {
        label: 'A con I paid for was cancelled or postponed',
        value: 'cancelled_con_badge',
        emoji: '🎟️',
      },
      {
        label: 'A flight to a con was cancelled or delayed 3+ hours',
        value: 'flight_delayed_or_cancelled',
        emoji: '✈️',
      },
      {
        label: 'An airline lost, delayed or crushed my bag (props, wigs, armor)',
        value: 'lost_bag',
        emoji: '🧳',
      },
      {
        label: 'Paid for a cosplay, prop or art commission that never arrived',
        value: 'commission_undelivered',
        emoji: '🧵',
      },
      {
        label: 'A figure preorder is 6+ months late or the shop went silent',
        value: 'late_figure_preorder',
        emoji: '📦',
      },
      { label: 'Nope, smooth so far', value: 'none', emoji: '✨' },
    ],
  },
  {
    id: 'q_paymethods',
    type: 'multiQuestion',
    title: 'How do you usually pay artists, sellers and cons?',
    subtitle:
      'Each one has a different dispute window. Heads up: Venmo, Cash App, Zelle and PayPal Friends & Family have almost no buyer protection.',
    profileKey: 'payMethods',
    options: [
      { label: 'Credit card', value: 'credit_card', emoji: '💳' },
      { label: 'PayPal (Goods & Services)', value: 'paypal_goods', emoji: '🅿️' },
      { label: 'Etsy checkout', value: 'etsy_checkout', emoji: '🧶' },
      { label: 'Debit card', value: 'debit_card', emoji: '🏦' },
      { label: 'Venmo / Cash App / Zelle / PayPal Friends & Family', value: 'p2p', emoji: '📱' },
    ],
  },
  {
    id: 'q_facebook',
    type: 'question',
    title: 'Did you have a public Facebook profile under your real name?',
    subtitle:
      'Weird question, real reason: video-privacy settlements like GameStop’s and Patreon’s only paid people who did, because the claim is that your viewing data was sent to Facebook.',
    profileKey: 'hadFacebookPublicProfile',
    options: [
      { label: 'Yes', value: 'yes', emoji: '👤' },
      { label: 'No', value: 'no' },
      { label: 'Not sure', value: 'unsure' },
    ],
  },
  {
    id: 'identity',
    type: 'identity',
    title: 'Who should the checks be made out to?',
    subtitle:
      'Your name goes on every form we prepare. Nothing leaves your phone until you send a form yourself.',
    cta: 'Continue',
  },
  {
    id: 'loading_scan',
    type: 'loading',
    title: 'Cross-checking your answers…',
    subtitle:
      'Crunchyroll… PlayStation Store… Google Play… Hot Topic… airline baggage rules… PayPal…',
  },
  {
    id: 'reveal_estimate',
    type: 'reveal',
    title: 'Your payout list',
    subtitle: 'New programs are added every week, and you’ll be alerted when one matches you.',
    cta: 'Claim it',
  },
  {
    id: 'chart_payouts',
    type: 'chart',
    title: 'What fans actually got paid',
    subtitle:
      'Documented per-person maximums from real programs. Closed ones show what you get when you file on time.',
    cta: 'Continue',
    options: [
      {
        label: 'Amazon Prime FTC refunds · OPEN',
        value: '200',
        sourceUrl: 'https://www.ftc.gov/enforcement/refunds/amazon-refunds',
      },
      {
        label: 'Patreon video-privacy settlement · CLOSED',
        value: '175',
        sourceUrl: 'https://patreonsettlement.com/faq/',
      },
      {
        label: 'PlayStation Store credit · AUTOMATIC',
        value: '33.66',
        sourceUrl: 'https://psndigitalgamessettlement.com/home/',
      },
      {
        label: 'Crunchyroll privacy settlement · CLOSED',
        value: '30',
        sourceUrl: 'https://www.crvppasettlement.com/',
      },
      {
        label: 'Ubisoft The Crew settlement · CLOSED',
        value: '15',
        sourceUrl: 'https://www.crewgamesettlement.com/',
      },
      {
        label: 'GameStop privacy settlement · CLOSED',
        value: '10',
        sourceUrl: 'https://www.gamestopvppasettlement.com/',
      },
    ],
  },
  {
    id: 'social_proof',
    type: 'socialProof',
    title: 'This isn’t a scam. It’s paperwork nobody does.',
    subtitle:
      'Real programs, real money already paid, and most of it only reaches people who show up.',
    cta: 'Continue',
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Deadlines don’t care that it’s con season.',
    subtitle:
      'One alert when a claim window opens for a program you match, one reminder before it closes, one when payouts start. PayPal gives you 180 days. Your card gives you 60. Nothing else, ever.',
    cta: 'Turn on deadline alerts',
  },
  {
    id: 'paywall',
    type: 'paywall',
    title: 'Unlock every claim.',
  },
];
