const { normalizeVerticalKey } = require("../../config/verticals");

const MANIFESTS = {
  startups: {
    key: "startups",
    status: "scaffolded",
    modules: ["initiatives", "backlog", "sprint_hub", "roadmap", "release_loop", "bug_reports"],
    note: "Architecture is scaffolded for later GitHub/CI/CD depth.",
  },
  insurance: {
    key: "insurance",
    status: "pilot_only",
    modules: ["claim_intake", "evidence_vault", "routing", "decision_review", "payout_tracker"],
    note: "Assistive AI only. Final claim decisions and payouts remain manual.",
  },
  student: {
    key: "student",
    status: "surface_scaffolded",
    modules: ["today", "courses", "calendar", "notes", "focus", "exams", "resources", "progress"],
    note: "Student surface stays separate from operator UX and uses softer trust copy.",
  },
};

const getVerticalManifest = (key) => {
  const normalizedKey = normalizeVerticalKey(key, key);
  return MANIFESTS[normalizedKey] || null;
};

module.exports = {
  getVerticalManifest,
};
