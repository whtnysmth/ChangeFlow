// Knowledge base content: the measurement map, seeded from the
// ChangeFlow measurement reference (September 2026). Each metric carries
// its practitioner term, its measurement type, how manual practice
// measures it, and what it links to as its source in ChangeFlow.

export const MEASUREMENT_GUIDE = [
  {
    phase: 'Assess',
    intro:
      'The phase where the organization is measured before the change begins. Dimensions are scored with evidence, and engagement mixes survey averages with interview judgment.',
    metrics: [
      {
        metric: 'Readiness score',
        term: 'Change readiness assessment',
        type: 'Qualitative · anchored',
        measured:
          'Practitioners score each readiness dimension, such as leadership alignment, culture, capacity, communication readiness, and process and systems readiness, on a rating scale like RAG or 1 to 5, using survey results, interviews, and focus groups as evidence. Each dimension carries a definition and scoring anchors so raters converge; scores are aggregated into one number. Practitioners treat the number as structured judgment with evidence, not as a direct measurement.',
        links:
          'Dimension records carrying definition, anchored rubric, score, notes, and evidence (who scored it, when, based on what).',
      },
      {
        metric: 'Stakeholder engagement',
        term: 'Stakeholder assessment',
        type: 'Mixed',
        measured:
          'Stakeholder mapping (influence against impact) is a qualitative exercise built from interviews and organizational knowledge. Engagement strength is often measured with Likert survey items ("How supportive are you of this change?") averaged per group. The interviews explain the survey, and the survey checks the interviews.',
        links: 'Survey items and results, stakeholder map rows, and interview notes.',
      },
    ],
  },
  {
    phase: 'Mobilize',
    intro:
      'The phase where the sponsor coalition and the communication machinery do their work. Sponsorship is assessed through observed behavior and scored; delivered communication is a count against the calendar.',
    metrics: [
      {
        metric: 'Sponsor coalition health',
        term: 'Sponsorship assessment',
        type: 'Qualitative · anchored',
        measured:
          'Practitioners assess sponsors through interviews and observed behavior: whether sponsors are visibly active, communicate directly to impacted groups, and build and sustain the broader coalition. The assessment is recorded as a rating with notes describing what the rater observed, including gaps such as absence from key forums.',
        links: 'Sponsor records, communication log evidence of sponsor messages, and observation notes.',
      },
      {
        metric: 'Communications sent',
        term: 'Communication calendar, delivered',
        type: 'Quantitative',
        measured:
          'A count of communications delivered against the communication calendar: messages, briefings, videos, town halls, per audience and per time period. Practitioners separate delivery from comprehension: delivery is counted, while whether people understood is gathered through feedback and pulse checks and handled as qualitative evidence.',
        links: 'Communication log entries that can be enumerated and filtered.',
      },
    ],
  },
  {
    phase: 'Enable',
    intro:
      'The phase where people learn the new way. Completion is a count; comprehension shows up in scored assessments.',
    metrics: [
      {
        metric: 'Training completion',
        term: 'Training plan completion',
        type: 'Quantitative',
        measured:
          'A count of impacted people who completed required training, tracked per audience and per milestone date. Practitioners separate completion from comprehension: completion is a number, while whether learners can perform the new way is measured through scored knowledge checks and observed practice.',
        links: 'Training records, plus knowledge check and assessment scores where they exist.',
      },
    ],
  },
  {
    phase: 'Adopt',
    intro:
      'The phase where usage becomes the truth. Usage is counted; barriers are judged, scored, and managed; wins are logged as stories and proven with data.',
    metrics: [
      {
        metric: 'Adoption rate',
        term: 'Adoption measurement (utilization)',
        type: 'Quantitative',
        measured:
          'The share of the target population using the new behavior, process, or system. Practitioners compute it from system logs, transaction records, or observed counts, compared against the full population that should be using it.',
        links: 'Usage logs or imported count records.',
      },
      {
        metric: 'Barrier analysis',
        term: 'Barrier analysis / resistance management',
        type: 'Qualitative · anchored',
        measured:
          'Practitioners surface barriers through interviews, focus groups, and observation (the ADKAR assessment asks directly, "Are there barriers inhibiting their ability?"). Each barrier is scored for severity and likelihood and assigned to an owner. The list stays live: barriers are re scored as mitigation progresses.',
        links:
          'Barrier records with severity ratings, owners, and the interview notes that surfaced them; ADKAR profiles that pin each barrier to the element it is blocking.',
      },
      {
        metric: 'Quick wins log',
        term: 'Short term wins',
        type: 'Mixed',
        measured:
          "Kotter's sixth step is producing short term wins. Practitioners log each win as a short qualitative record (what happened, who it was visible for, which resistance point it addresses), then count and value wins over time. A win only counts if it is visible and unambiguous.",
        links: 'Win entries, plus the adoption data that proves each win is real.',
      },
    ],
  },
  {
    phase: 'Sustain',
    intro:
      'The phase where the change either sticks or slowly reverses. Health is a scored judgment; risks are judged and counted; milestones are tracked and celebrated.',
    metrics: [
      {
        metric: 'Sustainment health',
        term: 'Sustainment assessment / reinforcement tracking',
        type: 'Qualitative · anchored',
        measured:
          'Practitioners check whether new behaviors still hold, whether reinforcement mechanisms (recognition, coaching, accountability) are operating, and what drift or revert they can observe. The result is a score on an anchored scale with notes, corroborated by usage trends.',
        links: 'Reinforcement evidence, usage trend data, and audit or observation notes.',
      },
      {
        metric: 'Open risks',
        term: 'Risk register',
        type: 'Mixed',
        measured:
          'Change programs keep a risk register: each risk is a qualitative judgment (description, likelihood, impact, owner, mitigation), while the open risk count is tracked quantitatively against a target of risks resolved or owned.',
        links: 'Risk register entries showing severity ratings, owners, and status; the count of currently open risks.',
      },
      {
        metric: 'Milestones',
        term: 'Milestone tracker',
        type: 'Quantitative',
        measured:
          'A count of milestones completed and on track versus planned dates, with slippage measured in days. Practitioners also use milestones as recognition moments: each completed milestone is a visible signal that progress is real.',
        links: 'Milestone records with planned and actual dates.',
      },
    ],
  },
]

export const TRANSLATION_RULE = [
  "Prosci's ADKAR assessment is the canonical example of the translation. A practitioner lists evidence notes for each element, then rates the element on an anchored 1 to 5 scale (1 is no awareness; 5 is total awareness). Readiness practice uses the same method with RAG ratings and explicit criteria, where each dimension carries named evidence.",
  'ChangeFlow follows the same rule: a qualitative score is legitimate when the definition, the anchors, the rating, and the evidence travel together. The source drill downs in the tool are this pattern; the map above extends it to every metric so no number exists without its own provenance.',
]
