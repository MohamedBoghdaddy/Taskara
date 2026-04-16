const CANONICAL_VERTICALS = Object.freeze({
  CORE: "core",
  RECRUITERS: "recruiters",
  AGENCIES: "agencies",
  REAL_ESTATE: "realestate",
  STARTUPS: "startups",
  INSURANCE: "insurance",
  STUDENT: "student",
});

// Accepted aliases during the stabilization window.
// New writes should always resolve to the canonical values below.
const VERTICAL_ALIASES = Object.freeze({
  core: CANONICAL_VERTICALS.CORE,
  recruiter: CANONICAL_VERTICALS.RECRUITERS,
  recruiters: CANONICAL_VERTICALS.RECRUITERS,
  agency: CANONICAL_VERTICALS.AGENCIES,
  agencies: CANONICAL_VERTICALS.AGENCIES,
  startup: CANONICAL_VERTICALS.STARTUPS,
  startups: CANONICAL_VERTICALS.STARTUPS,
  insurance: CANONICAL_VERTICALS.INSURANCE,
  "real-estate": CANONICAL_VERTICALS.REAL_ESTATE,
  real_estate: CANONICAL_VERTICALS.REAL_ESTATE,
  realestate: CANONICAL_VERTICALS.REAL_ESTATE,
  estate: CANONICAL_VERTICALS.REAL_ESTATE,
  student: CANONICAL_VERTICALS.STUDENT,
  students: CANONICAL_VERTICALS.STUDENT,
  study: CANONICAL_VERTICALS.STUDENT,
});

const normalizeVerticalKey = (value, fallback = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  return VERTICAL_ALIASES[raw] || fallback;
};

const isLegacyVerticalAlias = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;
  return Boolean(VERTICAL_ALIASES[raw] && VERTICAL_ALIASES[raw] !== raw);
};

module.exports = {
  CANONICAL_VERTICALS,
  VERTICAL_ALIASES,
  isLegacyVerticalAlias,
  normalizeVerticalKey,
};
