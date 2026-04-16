export const CANONICAL_VERTICALS = Object.freeze({
  CORE: 'core',
  RECRUITERS: 'recruiters',
  AGENCIES: 'agencies',
  REAL_ESTATE: 'realestate',
  STARTUPS: 'startups',
  INSURANCE: 'insurance',
  STUDENT: 'student',
});

// Accepted aliases during the stabilization window.
export const VERTICAL_ALIASES = Object.freeze({
  core: CANONICAL_VERTICALS.CORE,
  recruiter: CANONICAL_VERTICALS.RECRUITERS,
  recruiters: CANONICAL_VERTICALS.RECRUITERS,
  agency: CANONICAL_VERTICALS.AGENCIES,
  agencies: CANONICAL_VERTICALS.AGENCIES,
  startup: CANONICAL_VERTICALS.STARTUPS,
  startups: CANONICAL_VERTICALS.STARTUPS,
  insurance: CANONICAL_VERTICALS.INSURANCE,
  'real-estate': CANONICAL_VERTICALS.REAL_ESTATE,
  real_estate: CANONICAL_VERTICALS.REAL_ESTATE,
  realestate: CANONICAL_VERTICALS.REAL_ESTATE,
  estate: CANONICAL_VERTICALS.REAL_ESTATE,
  student: CANONICAL_VERTICALS.STUDENT,
  students: CANONICAL_VERTICALS.STUDENT,
  study: CANONICAL_VERTICALS.STUDENT,
});

export const normalizeVerticalKey = (value, fallback = CANONICAL_VERTICALS.CORE) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  return VERTICAL_ALIASES[raw] || fallback;
};

export const normalizeSurfaceMode = (value) =>
  String(value || '').trim().toLowerCase() === CANONICAL_VERTICALS.STUDENT ? 'student' : 'operator';
