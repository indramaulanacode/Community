/**
 * Seed data for the demo mode.
 *
 * There is no backend in this template: everything the UI shows comes from
 * here, and every mutation the UI makes is applied to a copy of it in
 * `src/store/AppStore.jsx`. Replace this file (or the `loadSeed()` call) with
 * API responses to wire up a real backend — the shapes are documented in
 * README.md under "Data model".
 *
 * Dates are generated relative to the moment the module first loads so the
 * dashboard always looks alive. Record IDs are stable strings.
 */
import { DAY_MS, addDays, rng } from '../lib/utils.js'

const TODAY = new Date()

/* ------------------------------------------------------------------ people -- */

const PEOPLE = [
  ['Maya Chen', 'Product Designer', 'Bandung, ID'],
  ['Arif Santoso', 'Frontend Engineer', 'Jakarta, ID'],
  ['Elena Vasquez', 'Design Lead', 'Lisbon, PT'],
  ['Tomás Ribeiro', 'iOS Engineer', 'Porto, PT'],
  ['Priya Nair', 'UX Researcher', 'Bengaluru, IN'],
  ['Daniel Okoye', 'Brand Designer', 'Lagos, NG'],
  ['Hana Sato', 'Motion Designer', 'Osaka, JP'],
  ['Marcus Feld', 'Staff Engineer', 'Berlin, DE'],
  ['Sofia Marino', 'Content Strategist', 'Milan, IT'],
  ['Yusuf Kaya', 'Growth Marketer', 'Istanbul, TR'],
  ['Grace Lim', 'Product Manager', 'Singapore, SG'],
  ['Owen Blake', 'Backend Engineer', 'Bristol, UK'],
  ['Nora Halvorsen', 'Design Systems', 'Oslo, NO'],
  ['Ravi Menon', 'Data Analyst', 'Toronto, CA'],
  ['Amira Haddad', 'Community Manager', 'Dubai, AE'],
  ['Jonas Weiss', 'Platform Engineer', 'Vienna, AT'],
  ['Karina Volkov', 'Illustrator', 'Tbilisi, GE'],
  ['Leo Martins', 'Game Developer', 'São Paulo, BR'],
  ['Ines Duarte', 'Accessibility Engineer', 'Madrid, ES'],
  ['Kwame Mensah', 'Engineering Manager', 'Accra, GH'],
  ['Sasha Petrov', 'Product Analyst', 'Belgrade, RS'],
  ['Elif Demir', 'UI Designer', 'Ankara, TR'],
  ['Noah Whitfield', 'DevRel', 'Melbourne, AU'],
  ['Zara Ahmed', 'UX Writer', 'London, UK'],
  ['Diego Fuentes', 'Growth Engineer', 'Mexico City, MX'],
  ['Mika Aalto', 'Sound Designer', 'Helsinki, FI'],
  ['Chloe Dupont', 'Brand Strategist', 'Lyon, FR'],
  ['Ivan Novak', 'QA Engineer', 'Prague, CZ'],
  ['Lina Haddad', 'Data Scientist', 'Amman, JO'],
  ['Theo Andersson', 'Design Educator', 'Malmö, SE'],
  ['Ayesha Rahman', 'Product Designer', 'Dhaka, BD'],
  ['Bruno Costa', 'Mobile Engineer', 'Rio de Janeiro, BR'],
  ['Freya Lund', 'Content Designer', 'Copenhagen, DK'],
  ['Idris Yahya', 'Solutions Architect', 'Nairobi, KE'],
  ['Jasmin Kwok', 'Design Technologist', 'Vancouver, CA'],
  ['Kostya Belyaev', 'Graphics Engineer', 'Yekaterinburg, RU'],
  ['Lucia Moreno', 'Service Designer', 'Bogotá, CO'],
  ['Mateo Rossi', 'Prototyper', 'Turin, IT'],
  ['Nadia Fahmy', 'Program Manager', 'Cairo, EG'],
  ['Oskar Lindqvist', 'Security Engineer', 'Stockholm, SE'],
  ['Paloma Reyes', 'Marketing Designer', 'Manila, PH'],
  ['Quentin Barre', 'Design Engineer', 'Nantes, FR'],
  ['Rosa Ibarra', 'Workshop Facilitator', 'Barcelona, ES'],
  ['Samuel Adeyemi', 'Technical Writer', 'Abuja, NG'],
  ['Talia Shapiro', 'Design Research Lead', 'Tel Aviv, IL'],
  ['Ulrich Braun', 'Infrastructure Engineer', 'Zurich, CH'],
  ['Vera Kovacs', 'Design Ops', 'Budapest, HU'],
  ['Wang Wei', 'Frontend Architect', 'Shenzhen, CN'],
  ['Ximena Torres', 'Visual Designer', 'Santiago, CL'],
  ['Yosef Abebe', 'Community Moderator', 'Addis Ababa, ET'],
]

const HANDLES_EXCEPTIONS = {
  'Paul Stain Walker': 'paulswalker',
}

const MEMBER_IDS = ['m-paul', ...PEOPLE.map((_, i) => `m-${String(i + 1).padStart(2, '0')}`)]

function handleFor(name) {
  if (HANDLES_EXCEPTIONS[name]) return HANDLES_EXCEPTIONS[name]
  const [first, last = ''] = name.toLowerCase().split(/\s+/)
  const seeded = rng(name.length * 977)()
  return seeded > 0.5 ? `${first}${last[0]}` : `${first}.${last}`
}

function emailFor(name) {
  const [first, last = ''] = name.toLowerCase().split(/\s+/)
  const domain = ['heycommunities.io', 'northbeam.co', 'mailbox.dev', 'proton.me'][
    (first.length + last.length) % 4
  ]
  return `${first}.${last}@${domain}`
}

const BIOS = [
  'I run critique sessions, break things into systems, and keep a very long note on spacing.',
  'Shipping small, measurable improvements beats one big rewrite. Ask me about design tokens.',
  'Ex-agency, now in-house. I care about accessibility budgets and honest documentation.',
  'Workshop nerd. If the whiteboard is still clean, the meeting went badly.',
  'Building the boring parts properly: naming, tokens, handoff, and the docs nobody reads.',
  'Prototypes over decks. I would rather break the model in front of you than pretend.',
  'Community first, product second — people stay for the room, not the feature.',
  'Turning messy feedback threads into a backlog someone can actually work from.',
]

/* -------------------------------------------------------------- communities -- */

const COMMUNITY_SEEDS = [
  {
    id: 'c-design-circle',
    name: 'Design Feedback Circle',
    category: 'Design',
    visibility: 'private',
    accent: 'accent',
    about:
      'A small, moderated room for senior designers trading work-in-progress critique. Two rounds of feedback per submission, no client names, no screenshots of shipped products.',
    channels: [
      { name: 'critique-queue', kind: 'chat' },
      { name: 'teardowns', kind: 'chat' },
      { name: 'job-board', kind: 'chat' },
      { name: 'resources', kind: 'resources' },
    ],
    tags: ['critique', 'design systems', 'portfolio'],
  },
  {
    id: 'c-webdev',
    name: 'Web Developers Hub',
    category: 'Engineering',
    visibility: 'public',
    accent: 'brand',
    about:
      'Open help channel for web developers. Frontend, backend, tooling and deployment. Every question gets an answer within a day, and every answer links to something you can read.',
    channels: [
      { name: 'introductions', kind: 'announcement' },
      { name: 'help-frontend', kind: 'chat' },
      { name: 'help-backend', kind: 'chat' },
      { name: 'show-and-tell', kind: 'chat' },
      { name: 'hiring', kind: 'chat' },
    ],
    tags: ['javascript', 'help', 'open source'],
  },
  {
    id: 'c-product-guild',
    name: 'Product Builders Guild',
    category: 'Product',
    visibility: 'public',
    accent: 'chart-3',
    about:
      'For people who ship. Weekly build logs, discovery notes and the occasional post-mortem. Membership is open but you are expected to read the pinned experiment template first.',
    channels: [
      { name: 'build-logs', kind: 'chat' },
      { name: 'discovery', kind: 'chat' },
      { name: 'experiments', kind: 'chat' },
      { name: 'library', kind: 'resources' },
    ],
    tags: ['discovery', 'experiments', 'roadmap'],
  },
  {
    id: 'c-creator-lab',
    name: 'Creator Economy Lab',
    category: 'Creator',
    visibility: 'public',
    accent: 'chart-4',
    about:
      'Writers, video makers and newsletter operators comparing numbers. We talk pricing, sponsorship rates and audience retention with real figures, not vibes.',
    channels: [
      { name: 'monetisation', kind: 'chat' },
      { name: 'sponsors', kind: 'chat' },
      { name: 'drops', kind: 'chat' },
    ],
    tags: ['monetisation', 'sponsorship', 'newsletter'],
  },
  {
    id: 'c-frontend-school',
    name: 'Frontend School',
    category: 'Learning',
    visibility: 'public',
    accent: 'chart-5',
    about:
      'A cohort-based learning community. Twelve-week tracks, weekly live sessions and pair reviews. Mentors are volunteers from the industry and the curriculum is maintained in the open.',
    channels: [
      { name: 'cohort-12', kind: 'chat' },
      { name: 'homework', kind: 'chat' },
      { name: 'mentor-lounge', kind: 'chat' },
      { name: 'curriculum', kind: 'resources' },
    ],
    tags: ['learning', 'mentoring', 'cohorts'],
  },
  {
    id: 'c-founders',
    name: 'Founders Roundtable',
    category: 'Founder',
    visibility: 'private',
    accent: 'chart-1',
    about:
      'Invitation-only room for founders between seed and Series A. Chatham House rule. Two tables per week, fifteen minutes each, no pitching.',
    channels: [
      { name: 'weekly-tables', kind: 'chat' },
      { name: 'off-topic', kind: 'chat' },
    ],
    tags: ['founders', 'private', 'peer support'],
  },
  {
    id: 'c-wellness',
    name: 'Wellness Wednesday',
    category: 'Wellness',
    visibility: 'public',
    accent: 'success',
    about:
      'Movement, sleep and screen habits for people who sit too long. Walk-and-talk calls, stretch reminders and one very serious argument about standing desks.',
    channels: [
      { name: 'stretch-breaks', kind: 'chat' },
      { name: 'walk-and-talk', kind: 'chat' },
    ],
    tags: ['health', 'habits', 'remote work'],
  },
  {
    id: 'c-indie-games',
    name: 'Indie Game Devs',
    category: 'Gaming',
    visibility: 'public',
    accent: 'warning',
    about:
      'Small teams making strange games. Playtest swaps, asset reviews and a shared spreadsheet of every conference that is actually worth the travel.',
    channels: [
      { name: 'playtests', kind: 'chat' },
      { name: 'assets', kind: 'chat' },
      { name: 'conferences', kind: 'chat' },
      { name: 'engine-help', kind: 'chat' },
    ],
    tags: ['gamedev', 'playtest', 'indie'],
  },
]

const ROLES = ['owner', 'moderator', 'member', 'member', 'member']
const STATUSES = ['active', 'active', 'active', 'active', 'active', 'invited', 'inactive', 'suspended']

const PRESENCE_HUES = [212, 348, 168, 276, 32, 190, 8, 128]

/* ------------------------------------------------------------------ events -- */

const EVENT_SEEDS = [
  ['Design critique: onboarding flows', 'c-design-circle', 'Workshop', -2, 10, 90],
  ['Portfolio teardown night', 'c-design-circle', 'Live stream', 6, 8, 120],
  ['Type scale clinic', 'c-design-circle', 'Workshop', 17, 6, 40],
  ['React 19 in production', 'c-webdev', 'AMA', -9, 22, 300],
  ['Edge deployment clinic', 'c-webdev', 'Workshop', 3, 14, 150],
  ['Open source maintainer panel', 'c-webdev', 'Panel', 12, 18, 220],
  ['Interview practice circle', 'c-webdev', 'Meetup', 21, 9, 60],
  ['Build log review: week 41', 'c-product-guild', 'Workshop', -5, 11, 85],
  ['Pricing experiment clinic', 'c-product-guild', 'Workshop', 9, 13, 110],
  ['Discovery note swap', 'c-product-guild', 'Meetup', 24, 7, 45],
  ['Newsletter sponsor rate survey', 'c-creator-lab', 'AMA', -12, 20, 180],
  ['Podcast drop review', 'c-creator-lab', 'Live stream', 5, 16, 140],
  ['Cohort 12 kickoff', 'c-frontend-school', 'Cohort', -20, 18, 60],
  ['Cohort 12 midpoint review', 'c-frontend-school', 'Cohort', 2, 16, 60],
  ['CSS layout deep dive', 'c-frontend-school', 'Workshop', 14, 10, 95],
  ['Demo day: cohort 11', 'c-frontend-school', 'Demo', 28, 12, 200],
  ['Founders table: hiring the first five', 'c-founders', 'Roundtable', 1, 15, 15],
  ['Founders table: runway honesty', 'c-founders', 'Roundtable', 8, 15, 15],
  ['Founders table: what we cut', 'c-founders', 'Roundtable', 15, 15, 15],
  ['Morning stretch call', 'c-wellness', 'Social', 0, 7, 30],
  ['Sleep clinic with a shift worker', 'c-wellness', 'AMA', 4, 12, 55],
  ['Walk and talk: Bandung campus', 'c-wellness', 'Meetup', 11, 8, 25],
  ['Playtest swap: prototype builds', 'c-indie-games', 'Playtest', -3, 13, 40],
  ['Playtest swap: vertical slice', 'c-indie-games', 'Playtest', 7, 19, 40],
  ['Conference ROI review', 'c-indie-games', 'Panel', 19, 11, 70],
]

const EVENT_DETAILS = {
  Workshop: 'Hands-on session. Bring your own work — the first half is input, the second half is you applying it to something real.',
  'Live stream': 'Broadcast in the community room with live chat. Recording shared to the library the next day.',
  AMA: 'Open question thread in advance, answered live. Questions are upvoted so the best ones get airtime.',
  Meetup: 'In-person table. Capacity is limited by the venue, not by moderation.',
  Panel: 'Three practitioners, forty minutes, then the floor opens. No slides.',
  Cohort: 'Scheduled learning block for enrolled cohorts. Attendance counts toward certification.',
  Roundtable: 'Chatham House rule, fifteen minutes per person, no pitching.',
  Social: 'Low-stakes hangout. Cameras optional, nobody takes notes.',
  Playtest: 'Bring a build under ten minutes long. Every playtester gives structured feedback.',
  Demo: 'Public showcase of cohort work. Invited guests welcome.',
}

const VENUES = {
  'Live stream': { mode: 'online', label: 'Community room — streaming' },
  AMA: { mode: 'online', label: 'Community room — live Q&A' },
  'Roundtable': { mode: 'online', label: 'Private video room' },
  Workshop: { mode: 'hybrid', label: 'Studio 4, Jl. Braga 22 + online' },
  Cohort: { mode: 'online', label: 'Cohort classroom' },
  Demo: { mode: 'hybrid', label: 'Northbeam Hall + stream' },
  Meetup: { mode: 'venue', label: 'Kopi Kina, Bandung' },
  Social: { mode: 'venue', label: 'Taman Lansekap, morning loop' },
  Playtest: { mode: 'online', label: 'Discord stage + build share' },
  Panel: { mode: 'hybrid', label: 'Studio 4 + stream' },
}

/* ------------------------------------------------------------------- tasks -- */

const TASK_SEEDS = [
  ['Moderate the critique queue backlog', 'c-design-circle', 'review', 'high', 1, 'm-03', ['moderation']],
  ['Publish the Q4 community guidelines revision', 'c-design-circle', 'doing', 'medium', 5, 'm-15', ['policy']],
  ['Set up the token audit template', 'c-design-circle', 'todo', 'medium', 12, 'm-13', ['design systems']],
  ['Archive expired portfolio teardowns', 'c-design-circle', 'done', 'low', -6, 'm-17', ['housekeeping']],
  ['Answer the 14 open frontend help threads', 'c-webdev', 'doing', 'urgent', 0, 'm-02', ['support']],
  ['Rewrite the welcome announcement', 'c-webdev', 'todo', 'high', 3, 'm-11', ['content']],
  ['Review the accessibility audit doc', 'c-webdev', 'review', 'medium', 7, 'm-19', ['a11y']],
  ['Cut a release checklist for show-and-tell', 'c-webdev', 'done', 'low', -2, 'm-08', ['process']],
  ['Draft the hiring channel posting rules', 'c-webdev', 'todo', 'low', 18, 'm-20', ['policy']],
  ['Summarise week 41 build logs', 'c-product-guild', 'review', 'medium', 2, 'm-11', ['reporting']],
  ['Prepare the pricing experiment clinic deck', 'c-product-guild', 'doing', 'high', 8, 'm-23', ['events']],
  ['Collect discovery notes from three members', 'c-product-guild', 'todo', 'medium', 15, 'm-24', ['research']],
  ['Close out the Q3 experiment tracker', 'c-product-guild', 'done', 'high', -4, 'm-31', ['reporting']],
  ['Send sponsor rate survey reminders', 'c-creator-lab', 'doing', 'urgent', 1, 'm-10', ['outreach']],
  ['Publish the drop review thread', 'c-creator-lab', 'todo', 'medium', 4, 'm-09', ['content']],
  ['Clean up duplicate sponsor listings', 'c-creator-lab', 'done', 'low', -9, 'm-27', ['housekeeping']],
  ['Grade cohort 12 assignment four', 'c-frontend-school', 'doing', 'high', 2, 'm-30', ['teaching']],
  ['Record the CSS layout deep dive intro', 'c-frontend-school', 'todo', 'medium', 10, 'm-35', ['events']],
  ['Update the public curriculum outline', 'c-frontend-school', 'review', 'low', 16, 'm-33', ['content']],
  ['Pair mentors with the six new joiners', 'c-frontend-school', 'done', 'high', -1, 'm-15', ['onboarding']],
  ['Confirm the venue for founders table two', 'c-founders', 'review', 'urgent', 6, 'm-40', ['logistics']],
  ['Draft the runway honesty prompts', 'c-founders', 'todo', 'medium', 7, 'm-21', ['events']],
  ['Prepare the standing-desk debate agenda', 'c-wellness', 'todo', 'low', 9, 'm-01', ['events']],
  ['Publish the sleep clinic recording', 'c-wellness', 'doing', 'medium', 3, 'm-37', ['content']],
  ['Book the morning walk route', 'c-wellness', 'done', 'low', -3, 'm-43', ['logistics']],
  ['Package the playtest swap builds', 'c-indie-games', 'doing', 'high', 4, 'm-18', ['events']],
  ['Compile the conference ROI spreadsheet', 'c-indie-games', 'todo', 'medium', 13, 'm-36', ['research']],
  ['Triage engine-help bugs into the tracker', 'c-indie-games', 'review', 'high', 1, 'm-39', ['support']],
  ['Remove the leaked asset pack thread', 'c-indie-games', 'done', 'urgent', -7, 'm-28', ['moderation']],
  ['Export the monthly member report', 'c-webdev', 'todo', 'high', 6, 'm-paul', ['reporting']],
  ['Migrate pinned resources to the library', 'c-design-circle', 'todo', 'low', 20, 'm-paul', ['housekeeping']],
]

const TASK_NOTES = [
  'Start with the oldest threads — they are the ones people have stopped expecting answers to.',
  'Moderators agreed to split this into two passes so nobody owns the whole queue.',
  'Waiting on the revised copy before this can move to review.',
  'Pair with the channel owner; do not publish without a second read.',
  'Blocking the clinic prep, treat it as the priority this week.',
]

/* ----------------------------------------------------------------- content -- */

const COLLECTION_SEEDS = [
  ['Critique frameworks', 'c-design-circle', 'Reusable formats for giving feedback that does not deflate anyone.'],
  ['Frontend field guide', 'c-webdev', 'Everything we wish the intro docs had said about shipping real interfaces.'],
  ['Discovery templates', 'c-product-guild', 'Note templates, interview scripts and the minimum viable evidence trail.'],
  ['Monetisation numbers', 'c-creator-lab', 'Rate cards, retention benchmarks and sponsorship contract checkpoints.'],
  ['Cohort 12 library', 'c-frontend-school', 'Weekly recordings, readings and the pair-review rotation.'],
  ['Operations runbooks', 'c-design-circle', 'Moderation, escalation and onboarding checklists the team actually follows.'],
]

/* title, community, type, status, category, summary, views, likes, comments, day */
const CONTENT_SEEDS = [
  ['The critique format that finally worked', 'c-design-circle', 'post', 'published', 'Feedback', 'Three rounds became two, every comment had to name one proposed change, and the queue stopped arguing about taste.', 12, 1, 3, -18],
  ['Design tokens are a contract, not a palette', 'c-design-circle', 'guide', 'published', 'Design systems', 'The naming rules, the ownership model and the single review gate that keeps a token set from turning into a colour museum.', 34, 6, 11, -42],
  ['Why we killed the weekly design review', 'c-design-circle', 'post', 'published', 'Process', 'A standing meeting nobody prepared for, replaced with an async queue that closes itself. What we lost, and what we did not.', 8, 2, 4, -7],
  ['Accessibility budgets: a practical ceiling', 'c-design-circle', 'resource', 'scheduled', 'Accessibility', 'A ceiling for contrast, target size and keyboard traps that a small team can actually enforce during review.', 0, 0, 0, 4],
  ['Moderation escalation, one page', 'c-design-circle', 'guide', 'draft', 'Moderation', 'Four levels, one owner each, and the wording to use when a post crosses the line without turning into a debate.', 0, 0, 0, -3],
  ['React 19: what actually changed for us', 'c-webdev', 'post', 'published', 'Frontend', 'The compiler, actions and the ref-as-prop cleanup, measured against the two weeks we spent migrating.', 56, 14, 22, -21],
  ['Shipping without a design system team', 'c-webdev', 'guide', 'published', 'Frontend', 'How four engineers keep one component library honest with a shared checklist and no dedicated owner.', 41, 9, 15, -33],
  ['The deployment checklist we paste every Friday', 'c-webdev', 'resource', 'published', 'Tooling', 'Nineteen lines, ordered by what hurts most when it is forgotten: freeze, flag, migration, rollback.', 27, 4, 6, -11],
  ['Answering the same question 200 times', 'c-webdev', 'post', 'published', 'Community', 'Which questions are worth automating, which are worth pinning, and which mean the docs are quietly lying.', 19, 5, 8, -5],
  ['Performance budgets for small teams', 'c-webdev', 'resource', 'scheduled', 'Performance', 'Two numbers, one CI gate and a rule about images that covers most of the win without a dedicated performance rota.', 0, 0, 0, 9],
  ['Postmortem: the outage nobody noticed', 'c-webdev', 'post', 'draft', 'Reliability', 'A queue backed up for six days and not one person complained. The alert we did not have, and the one we added.', 0, 0, 0, -2],
  ['Build log: three weeks to a boring feature', 'c-product-guild', 'post', 'published', 'Build logs', 'Week one of research, week two of the ugly version, week three of deleting most of what we built.', 33, 7, 12, -14],
  ['Discovery notes template v3', 'c-product-guild', 'guide', 'published', 'Discovery', 'The three fields that survived four revisions: what we saw, what we inferred, what we would bet on.', 48, 11, 9, -28],
  ['How we write experiment briefs', 'c-product-guild', 'guide', 'published', 'Experiments', 'A hypothesis, one metric that can actually move, and the decision the result will be used to make.', 22, 3, 5, -9],
  ['Cutting a roadmap nobody believes in', 'c-product-guild', 'post', 'draft', 'Strategy', 'Re-scoping a nine-month plan into three bets after the team stopped defending the quarters out loud.', 0, 0, 0, -4],
  ['Sponsor rate survey: what 80 creators said', 'c-creator-lab', 'report', 'published', 'Monetisation', 'Ranges by audience size, what sponsors pay extra for, and the four line items most contracts forget.', 74, 18, 31, -37],
  ['The retention number that matters at 10k', 'c-creator-lab', 'post', 'published', 'Analytics', 'Open rate stops telling you anything past ten thousand subscribers. This is the cohort curve we watch instead.', 29, 6, 7, -16],
  ['Contract checkpoints before you sign', 'c-creator-lab', 'resource', 'published', 'Sponsorship', 'Six gates: usage rights, kill fee, approval rounds, payment timing, exclusivity and how far the morals clause reaches.', 37, 8, 10, -25],
  ['Newsletter pricing without the guesswork', 'c-creator-lab', 'guide', 'scheduled', 'Monetisation', 'A worked example of cost per send, sponsor slots and the break-even subscriber count before you raise rates.', 0, 0, 0, 6],
  ['Cohort 12 week four: layouts on purpose', 'c-frontend-school', 'lesson', 'published', 'Curriculum', 'Grid, flow and the two exercises where students first notice that spacing is an argument, not a preference.', 43, 12, 18, -23],
  ['Pair review rotation, explained', 'c-frontend-school', 'guide', 'published', 'Teaching', 'Who reviews whom, how the rotation avoids the same three names, and what happens when someone is out for a week.', 26, 5, 9, -12],
  ['Mentor handbook 2026', 'c-frontend-school', 'resource', 'published', 'Teaching', 'Session shape, feedback tone, escalation for a struggling mentee, and the boundaries we ask mentors to keep.', 31, 7, 6, -30],
  ['Founders table: hiring the first five', 'c-founders', 'post', 'published', 'Peer support', 'What five founders learned about their first hires, and which two of those hires they would not repeat.', 17, 4, 11, -8],
  ['Runway honesty: what we stopped pretending', 'c-founders', 'post', 'draft', 'Peer support', 'A template for writing the number down, putting it on the table and ending the polite fiction about next quarter.', 0, 0, 0, -1],
  ['Screen habits for people in ten calls a day', 'c-wellness', 'guide', 'published', 'Habits', 'The three habits that survived a month of trials: a hard stop, a walking first ten minutes, no calls before coffee.', 52, 13, 24, -34],
  ['Playtest feedback form that gets used', 'c-indie-games', 'resource', 'published', 'Playtesting', 'Eleven fields, one of them optional, and the reason we stopped asking testers whether they enjoyed it.', 21, 4, 7, -19],
  ['Conferences worth the travel, 2026', 'c-indie-games', 'report', 'scheduled', 'Events', 'Cost, signal and follow-up rate across the last two seasons of attendance, ranked without sentiment.', 0, 0, 0, 12],
  ['Vertical slice: what reviewers actually look at', 'c-indie-games', 'post', 'published', 'Craft', 'The first ninety seconds of a slice, what it has to prove, and the polish nobody in the room will notice.', 24, 6, 8, -6],
]

/**
 * Each item owns its opening paragraph; the closing note is assembled from the
 * type and the community it belongs to. A demo where all 28 posts share one body
 * reads as filler the moment a buyer opens two of them.
 */
const CONTENT_CLOSING = {
  post: 'Posted for discussion rather than as a decision — the summary up top gets edited as the thread settles, so read the comments before quoting this back to anyone.',
  guide: 'Kept current in the community library. If a step here has stopped working, say so on the post instead of forking a private version, and the owner will fold the fix in.',
  resource: 'Free to reuse. Copy the template into your own space before editing so the original stays a shared reference, and link your version back here if it changes the shape of it.',
  report: 'Method notes and the raw export are attached to the full version. Everything here is self-reported, so treat the ranges as directional and the trend as the actual finding.',
  lesson: 'Part of the cohort curriculum. The week notes, the two exercises and the session recording are linked under the reading, and mentors keep office hours against this week on Thursdays.',
}

const DRAFT_OUTLINE =
  'Outline only at the moment:\n\n- the problem in one paragraph, with the number that started it\n- what we tried first and why it did not hold\n- the change we would recommend, and who has to agree\n\nTarget is around 900 words. Needs a read from the community owner before it goes into the publishing queue.'

/* --------------------------------------------------------------- messages -- */

const MESSAGE_LINES = [
  'posted the revised onboarding flow — the second step is gone entirely',
  'anyone got a second read on the spacing scale? it feels tight at 13px',
  'the critique queue is at 19 again, I am taking the oldest five',
  'that deck was great, but the last three slides need real numbers',
  'recording is up in the library, chaptered',
  'we should stop pinning things nobody links to',
  'fixed the contrast issue in the badge component, pushed to main',
  'who is running the table on Thursday? I can cover if not',
  'the survey closed at 84 responses, analysis thread incoming',
  'heads up: three duplicate sponsor listings cleaned up',
  'pair review rotation moved, check the sheet before you book',
  'this is the template we used, steal it freely',
]

const REPLY_LINES = [
  'On it — give me an hour.',
  'Nice, that reads much better now.',
  'I can take that one if nobody else has.',
  'Numbers are in the pinned sheet, second tab.',
  'Agreed, but let us not decide it in chat. Table on Thursday?',
  'The 13px one is intentional, it matches the dense table.',
  'Thanks, this unblocks the whole queue.',
  'Flagging it to moderation now.',
]

/* ============================================================== assembly === */

const buildMembers = () => {
  const rand = rng(4242)
  const all = [{ id: 'm-paul', name: 'Paul Stain Walker', title: 'Freelance Graphic Designer', location: 'Bandung, ID' }, ...PEOPLE.map(([name, title, location], i) => ({ id: MEMBER_IDS[i + 1], name, title, location }))]
  const usedHandles = new Set()
  const usedEmails = new Set()

  return all.map((person, index) => {
    const isSelf = person.id === 'm-paul'
    const role = isSelf ? 'owner' : ROLES[Math.floor(rand() * ROLES.length)]
    const status = isSelf ? 'active' : STATUSES[Math.floor(rand() * STATUSES.length)]
    const joinedDaysAgo = isSelf ? 640 : Math.floor(rand() * 700) + 4
    // Skewed toward "recently active" so the online count looks realistic
    // instead of a flat random spread across ten days.
    const lastActiveHours = isSelf ? 0 : Math.floor(Math.pow(rand(), 2.4) * 260)
    const online = lastActiveHours < 3 && status === 'active'

    let handle = handleFor(person.name)
    while (usedHandles.has(handle)) handle = `${handle}${index}`
    usedHandles.add(handle)

    let email = emailFor(person.name)
    while (usedEmails.has(email)) email = email.replace('@', `${index}@`)
    usedEmails.add(email)

    return {
      id: person.id,
      name: person.name,
      handle,
      email,
      title: person.title,
      location: person.location,
      bio: BIOS[(index + 2) % BIOS.length],
      role,
      status,
      joinedAt: new Date(TODAY.getTime() - joinedDaysAgo * DAY_MS).toISOString(),
      lastActiveAt: new Date(TODAY.getTime() - lastActiveHours * 3_600_000).toISOString(),
      online,
      hue: PRESENCE_HUES[index % PRESENCE_HUES.length],
      level: isSelf ? 10 : Math.floor(rand() * 12) + 1,
      followers: Math.floor(rand() * 1800) + 40,
      following: Math.floor(rand() * 400) + 10,
      contributions: {
        posts: Math.floor(rand() * 84) + 1,
        comments: Math.floor(rand() * 260) + 4,
        reactions: Math.floor(rand() * 900) + 12,
      },
      communityIds: [],
    }
  })
}

const buildCommunities = (members) => {
  const rand = rng(1337)
  return COMMUNITY_SEEDS.map((seed, communityIndex) => {
    const pool = members.filter((m) => m.status !== 'suspended')
    const size = 6 + Math.floor(rand() * (communityIndex === 1 ? 22 : 14))
    const picked = pool.slice(communityIndex * 3, communityIndex * 3 + size)
    const memberIds = picked.map((m) => m.id)
    if (!memberIds.includes('m-paul')) memberIds.unshift('m-paul')
    memberIds.forEach((id) => {
      const found = members.find((m) => m.id === id)
      if (found) found.communityIds.push(seed.id)
    })

    const ownerId = memberIds.find((id) => id !== 'm-paul') || 'm-paul'
    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      visibility: seed.visibility,
      accent: seed.accent,
      about: seed.about,
      tags: seed.tags,
      ownerId,
      moderatorIds: memberIds.filter((id) => id !== ownerId).slice(0, 3),
      memberIds,
      channels: seed.channels.map((channel, i) => ({
        id: `${seed.id}-ch-${i + 1}`,
        name: channel.name,
        kind: channel.kind,
        unread: channel.kind === 'chat' ? Math.floor(rand() * 14) : 0,
      })),
      createdAt: new Date(TODAY.getTime() - (260 + communityIndex * 40) * DAY_MS).toISOString(),
      engagementRate: 24 + Math.floor(rand() * 52),
      isFavorite: communityIndex < 2,
    }
  })
}

const buildEvents = (communities, members) => {
  const rand = rng(9091)
  return EVENT_SEEDS.map(([title, communityId, kind, offsetDays, hour, capacity], i) => {
    const community = communities.find((c) => c.id === communityId)
    const startsAt = new Date(TODAY.getTime() + offsetDays * DAY_MS)
    startsAt.setHours(hour, [0, 15, 30, 45][i % 4], 0, 0)
    const durationMinutes = [60, 75, 90, 120][Math.floor(rand() * 4)]
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000)

    const roster = community ? community.memberIds : []
    const attendeeCount = Math.max(
      3,
      Math.min(roster.length - 1, Math.floor(roster.length * (0.3 + rand() * 0.5))),
    )
    const attendeeIds = roster.filter((id) => id !== community?.ownerId).slice(0, attendeeCount)

    return {
      id: `e-${String(i + 1).padStart(2, '0')}`,
      title,
      kind,
      communityId,
      hostId: community?.ownerId || 'm-paul',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity,
      location: VENUES[kind] || { mode: 'online', label: 'Community room' },
      attendeeIds,
      status: 'scheduled',
      description: `${EVENT_DETAILS[kind] || 'Community session.'} Hosted by ${
        members.find((m) => m.id === community?.ownerId)?.name || 'the moderation team'
      }, part of ${community?.name || 'the community calendar'}.`,
    }
  })
}

const TASK_LABELS = [
  'moderation', 'policy', 'design systems', 'housekeeping', 'support', 'content',
  'a11y', 'process', 'reporting', 'research', 'events', 'outreach', 'teaching',
  'onboarding', 'logistics',
]

const buildTasks = (communities, members) => {
  const rand = rng(5150)

  return TASK_SEEDS.map(
    ([title, communityId, status, priority, dueOffset, assigneeId, tags], i) => {
      const community = communities.find((c) => c.id === communityId)
      const dueDate = addDays(TODAY, dueOffset)
      dueDate.setHours(17, 0, 0, 0)
      const creatorId = community?.ownerId || 'm-paul'
      const watcherIds = (community?.memberIds || [])
        .filter((id) => id !== assigneeId && id !== creatorId)
        .slice(0, 1 + Math.floor(rand() * 3))

      return {
        id: `t-${String(i + 1).padStart(2, '0')}`,
        title,
        description: TASK_NOTES[i % TASK_NOTES.length],
        status,
        priority,
        dueDate: dueDate.toISOString(),
        assigneeId,
        assigneeName: members.find((m) => m.id === assigneeId)?.name || 'Unassigned',
        communityId,
        creatorId,
        watcherIds,
        labels: tags,
        createdAt: new Date(dueDate.getTime() - (7 + Math.floor(rand() * 20)) * DAY_MS).toISOString(),
        completedAt: status === 'done' ? new Date(dueDate.getTime() - DAY_MS).toISOString() : null,
      }
    },
  )
}

const buildContent = (communities, members) => {
  const collections = COLLECTION_SEEDS.map(([name, communityId, description], i) => ({
    id: `col-${String(i + 1).padStart(2, '0')}`,
    name,
    description,
    communityId,
    visibility: i % 3 === 0 ? 'private' : 'public',
    createdAt: new Date(TODAY.getTime() - (120 + i * 26) * DAY_MS).toISOString(),
    itemIds: [],
  }))

  const rand = rng(7777)
  const items = CONTENT_SEEDS.map(
    ([title, communityId, type, status, category, summary, views, likes, comments, dayOffset], i) => {
      const community = communities.find((c) => c.id === communityId)
      const authorId =
        community?.ownerId || members[Math.floor(rand() * members.length)].id
      const when = addDays(TODAY, dayOffset)
      when.setHours([8, 10, 13, 16, 19][i % 5], 0, 0, 0)
      const candidates = collections.filter((c) => c.communityId === communityId)
      const collection = candidates.length
        ? candidates[i % candidates.length]
        : collections[i % collections.length]
      const id = `p-${String(i + 1).padStart(2, '0')}`
      collection.itemIds.push(id)

      const closing = CONTENT_CLOSING[type] || CONTENT_CLOSING.post
      return {
        id,
        title,
        excerpt: summary,
        body:
          status === 'draft'
            ? `${summary}\n\n${DRAFT_OUTLINE}\n\n${closing}`
            : `${summary}\n\n${closing}`,
        type,
        status,
        category,
        authorId,
        communityId,
        collectionId: collection.id,
        publishedAt: status === 'published' ? when.toISOString() : null,
        scheduledFor: status === 'scheduled' ? when.toISOString() : null,
        metrics: { views, likes, comments, shares: Math.round(views * 0.12) },
        updatedAt: new Date(when.getTime() - 2 * DAY_MS).toISOString(),
      }
    },
  )

  return { collections, items }
}

const buildConversations = (communities, members) => {
  const rand = rng(2468)
  return communities.slice(0, 6).map((community, i) => {
    const roster = community.memberIds.filter((id) => id !== 'm-paul')
    const senderIds = roster.slice(0, 4 + Math.floor(rand() * 3))
    const channel = community.channels[0]
    const count = 5 + Math.floor(rand() * 5)
    const messages = Array.from({ length: count }, (_, k) => {
      const at = new Date(
        TODAY.getTime() - (count - k) * (1 + Math.floor(rand() * 5)) * 3_600_000,
      )
      const mine = k % 4 === 2
      return {
        id: `${community.id}-msg-${k + 1}`,
        authorId: mine ? 'm-paul' : senderIds[k % senderIds.length],
        body: mine
          ? REPLY_LINES[k % REPLY_LINES.length]
          : MESSAGE_LINES[(i * 3 + k) % MESSAGE_LINES.length],
        at: at.toISOString(),
        reactions: Math.floor(rand() * 6),
      }
    })

    return {
      id: `conv-${String(i + 1).padStart(2, '0')}`,
      kind: 'channel',
      title: `#${channel.name}`,
      communityId: community.id,
      memberIds: community.memberIds,
      messages,
      unread: channel.unread,
      lastActivityAt: messages[messages.length - 1].at,
    }
  })
}

const buildNotifications = (communities, members, events, tasks, items) => {
  const templates = [
    {
      kind: 'event',
      title: 'Edge deployment clinic starts in 3 days',
      body: `${events.find((e) => e.id === 'e-05')?.attendeeIds.length ?? 12} members are registered. Capacity is 150.`,
      target: { type: 'event', id: 'e-05' },
      hoursAgo: 2,
      actorId: 'm-02',
    },
    {
      kind: 'task',
      title: 'Maya Chen moved a task to review',
      body: 'Triage engine-help bugs into the tracker is waiting for a second read.',
      target: { type: 'task', id: 't-28' },
      hoursAgo: 4,
      actorId: 'm-01',
    },
    {
      kind: 'member',
      title: '4 new members joined Web Developers Hub',
      body: 'They have not been introduced yet. The welcome channel is a good first nudge.',
      target: { type: 'community', id: 'c-webdev' },
      hoursAgo: 7,
      actorId: null,
    },
    {
      kind: 'content',
      title: 'Sponsor rate survey is trending',
      body: '74 views in the last 24 hours, 31 comments. Worth a pinned post.',
      target: { type: 'content', id: 'p-16' },
      hoursAgo: 11,
      actorId: 'm-10',
    },
    {
      kind: 'moderation',
      title: 'A thread needs your decision',
      body: 'Two members flagged the hiring channel for duplicate postings.',
      target: { type: 'community', id: 'c-webdev' },
      hoursAgo: 20,
      actorId: 'm-20',
      urgent: true,
    },
    {
      kind: 'event',
      title: 'Founders table confirmed for Thursday',
      body: 'Fifteen minutes each, Chatham House rule, venue held.',
      target: { type: 'event', id: 'e-17' },
      hoursAgo: 26,
      actorId: 'm-40',
    },
    {
      kind: 'task',
      title: 'Answer the 14 open frontend threads is overdue',
      body: 'Assigned to you, deadline passed. Reassign or extend it.',
      target: { type: 'task', id: 't-05' },
      hoursAgo: 31,
      actorId: null,
      urgent: true,
    },
    {
      kind: 'content',
      title: 'Newsletter pricing is scheduled',
      body: 'Publishing in six days. Review the draft before it goes out.',
      target: { type: 'content', id: 'p-19' },
      hoursAgo: 40,
      actorId: 'm-09',
    },
    {
      kind: 'member',
      title: 'Yosef Abebe was promoted to moderator',
      body: 'Indie Game Devs now has four moderators on rotation.',
      target: { type: 'member', id: 'm-50' },
      hoursAgo: 52,
      actorId: 'm-18',
    },
    {
      kind: 'report',
      title: 'Monthly member report is ready',
      body: 'Growth up 6.2 percent, engagement flat. Export from Analytics.',
      target: { type: 'analytics', id: 'report-2026-10' },
      hoursAgo: 62,
      actorId: null,
    },
    {
      kind: 'event',
      title: 'Playtest swap needs builds',
      body: 'Eight slots open, three filled. Reminders go out tomorrow.',
      target: { type: 'event', id: 'e-24' },
      hoursAgo: 74,
      actorId: 'm-18',
    },
    {
      kind: 'content',
      title: 'Accessibility budgets moved to scheduled',
      body: 'Queued for publication in four days.',
      target: { type: 'content', id: 'p-04' },
      hoursAgo: 90,
      actorId: 'm-19',
    },
    {
      kind: 'task',
      title: 'Vera Kovacs closed Archive expired portfolio teardowns',
      body: 'Marked done six days early. Nothing else waiting in that group.',
      target: { type: 'task', id: 't-04' },
      hoursAgo: 120,
      actorId: 'm-47',
    },
    {
      kind: 'member',
      title: '3 invitations are about to expire',
      body: 'Invited members who never accept should be cleaned up monthly.',
      target: { type: 'members', id: 'invites' },
      hoursAgo: 143,
      actorId: null,
    },
  ]

  return templates.map((tpl, i) => ({
    id: `n-${String(i + 1).padStart(2, '0')}`,
    ...tpl,
    at: new Date(TODAY.getTime() - tpl.hoursAgo * 3_600_000).toISOString(),
    read: i >= 6,
  }))
}

const buildActivity = (members, communities, items, tasks, events) => {
  const entries = [
    ['m-03', 'posted', 'content', items[0].id, 1],
    ['m-02', 'answered a thread in', 'community', 'c-webdev', 2],
    ['m-15', 'invited', 'member', 'm-48', 3],
    ['m-01', 'moved to review', 'task', tasks[0].id, 4],
    ['m-10', 'published', 'content', items[15].id, 6],
    ['m-18', 'created event', 'event', events[23].id, 8],
    ['m-11', 'commented on', 'content', items[11].id, 10],
    ['m-19', 'flagged a thread in', 'community', 'c-webdev', 12],
    ['m-30', 'graded work for', 'community', 'c-frontend-school', 16],
    ['m-40', 'confirmed venue for', 'event', events[16].id, 20],
    ['m-13', 'updated tokens in', 'community', 'c-design-circle', 24],
    ['m-23', 'shared a build log in', 'community', 'c-product-guild', 28],
    ['m-09', 'scheduled', 'content', items[18].id, 33],
    ['m-47', 'completed', 'task', tasks[3].id, 40],
    ['m-35', 'joined', 'community', 'c-frontend-school', 46],
    ['m-27', 'archived', 'content', items[14].id, 52],
    ['m-21', 'started a thread in', 'community', 'c-founders', 58],
    ['m-37', 'uploaded a recording to', 'community', 'c-wellness', 64],
    ['m-36', 'edited', 'task', tasks[26].id, 70],
    ['m-43', 'organised', 'event', events[19].id, 78],
  ]

  return entries.map(([actorId, verb, targetKind, targetId, hoursAgo], i) => ({
    id: `a-${String(i + 1).padStart(2, '0')}`,
    actorId,
    actorName: members.find((m) => m.id === actorId)?.name || 'A member',
    verb,
    targetKind,
    targetId,
    at: new Date(TODAY.getTime() - hoursAgo * 3_600_000).toISOString(),
  }))
}

/**
 * Historical time series only. Anything that can be derived from the live
 * records — current totals, per-community breakdowns, content performance,
 * event attendance — is computed in `src/store/selectors.js` instead, so a
 * mutation in the UI immediately shows up in the charts. The current month and
 * the current day are rebuilt from live data as well; these two series are the
 * part of history a demo cannot reconstruct.
 */
const buildAnalytics = (members) => {
  const rand = rng(3141)

  // Twelve months ending on the current one; the selector overwrites that last
  // point with live counts, so the series never shows the same month twice.
  const monthlyHistory = Array.from({ length: 12 }, (_, i) => {
    const stamp = new Date(TODAY.getFullYear(), TODAY.getMonth() - (11 - i), 1)
    return {
      key: `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}`,
      label: stamp.toLocaleString('en-US', { month: 'short' }),
      year: stamp.getFullYear(),
      joined: 2 + Math.floor(rand() * 4),
      departed: Math.floor(rand() * 2),
    }
  })

  // Fifty-nine days back so analytics can compare a 30-day window against the
  // window before it; the UI slices the last 30.
  const dailyHistory = []
  for (let back = 59; back >= 1; back -= 1) {
    const stamp = addDays(new Date(), -back)
    const weekday = stamp.getDay()
    const quiet = weekday === 0 || weekday === 6 ? 0.55 : 1
    const posts = Math.round((6 + rand() * 18) * quiet)
    const comments = Math.round(posts * (1.6 + rand() * 1.4))
    const reactions = Math.round(comments * (2.2 + rand() * 1.6))
    dailyHistory.push({
      key: stamp.toISOString().slice(0, 10),
      label: stamp.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
      activeMembers: Math.round(members.length * (0.28 + rand() * 0.22) * quiet),
      posts,
      comments,
      reactions,
    })
  }

  return { monthlyHistory, dailyHistory }
}

export function loadSeed() {
  const members = buildMembers()
  const communities = buildCommunities(members)
  const events = buildEvents(communities, members)
  const tasks = buildTasks(communities, members)
  const { collections, items } = buildContent(communities, members)
  const conversations = buildConversations(communities, members)
  const notifications = buildNotifications(communities, members, events, tasks, items)
  const activity = buildActivity(members, communities, items, tasks, events)
  const analytics = buildAnalytics(members)

  return {
    version: 1,
    seededAt: TODAY.toISOString(),
    currentUserId: 'm-paul',
    workspace: {
      name: 'Northbeam Collective',
      plan: 'Team',
      seatLimit: 500,
      domain: 'northbeam.community',
      timezone: 'Asia/Jakarta (GMT+7)',
      billingContact: 'ops@northbeam.community',
    },
    members,
    communities,
    events,
    tasks,
    collections,
    content: items,
    conversations,
    notifications,
    activity,
    analytics,
    prefs: {
      theme: 'system',
      sidebarCollapsed: false,
      landingPage: 'dashboard',
      notify: {
        weeklyDigest: true,
        eventReminders: true,
        newMembers: false,
        moderationQueue: true,
        mentions: true,
      },
    },
  }
}

/** Categories used by filters — kept here so every screen offers the same list. */
export const COMMUNITY_CATEGORIES = [...new Set(COMMUNITY_SEEDS.map((c) => c.category))]
export const EVENT_KINDS = [...new Set(EVENT_SEEDS.map((e) => e[2]))]
export const CONTENT_TYPES = [...new Set(CONTENT_SEEDS.map((c) => c[2]))]

export const TASK_STATUSES = [
  { key: 'todo', label: 'To do', tone: 'neutral' },
  { key: 'doing', label: 'In progress', tone: 'brand' },
  { key: 'review', label: 'In review', tone: 'warning' },
  { key: 'done', label: 'Done', tone: 'success' },
]

export const TASK_PRIORITIES = [
  { key: 'urgent', label: 'Urgent', tone: 'danger' },
  { key: 'high', label: 'High', tone: 'warning' },
  { key: 'medium', label: 'Medium', tone: 'brand' },
  { key: 'low', label: 'Low', tone: 'neutral' },
]

export const MEMBER_ROLES = [
  { key: 'owner', label: 'Owner' },
  { key: 'moderator', label: 'Moderator' },
  { key: 'member', label: 'Member' },
]

export const MEMBER_STATUSES = [
  { key: 'active', label: 'Active', tone: 'success' },
  { key: 'invited', label: 'Invited', tone: 'warning' },
  { key: 'inactive', label: 'Inactive', tone: 'neutral' },
  { key: 'suspended', label: 'Suspended', tone: 'danger' },
]

export const CONTENT_STATUSES = [
  { key: 'draft', label: 'Draft', tone: 'neutral' },
  { key: 'scheduled', label: 'Scheduled', tone: 'warning' },
  { key: 'published', label: 'Published', tone: 'success' },
]
