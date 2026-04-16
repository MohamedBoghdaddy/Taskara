const Workspace = require("../../models/Workspace");
const { CANONICAL_VERTICALS, normalizeVerticalKey } = require("../../config/verticals");

const STUDENT_PROFILE = {
  vertical: CANONICAL_VERTICALS.STUDENT,
  surfaceMode: "student",
  featureProfile: "student_survival",
  trustProfile: "student",
};

const DEFAULT_WORKSPACE_CONTEXT = {
  vertical: CANONICAL_VERTICALS.CORE,
  surfaceMode: "operator",
  featureProfile: "core",
  trustProfile: "operator",
};

const AUDIENCE_WORKSPACE_PROFILES = {
  recruiters: {
    vertical: CANONICAL_VERTICALS.RECRUITERS,
    surfaceMode: "operator",
    featureProfile: "recruiter_execution",
    trustProfile: "operator",
  },
  agencies: {
    vertical: CANONICAL_VERTICALS.AGENCIES,
    surfaceMode: "operator",
    featureProfile: "agency_operations",
    trustProfile: "operator",
  },
  realestate: {
    vertical: CANONICAL_VERTICALS.REAL_ESTATE,
    surfaceMode: "operator",
    featureProfile: "realestate_operations",
    trustProfile: "operator",
  },
  startups: {
    vertical: CANONICAL_VERTICALS.STARTUPS,
    surfaceMode: "operator",
    featureProfile: "startup_execution",
    trustProfile: "operator",
  },
  insurance: {
    vertical: CANONICAL_VERTICALS.INSURANCE,
    surfaceMode: "operator",
    featureProfile: "insurance_pilot",
    trustProfile: "compliance",
  },
  student: STUDENT_PROFILE,
};

const buildWorkspaceContext = (workspace = null) => ({
  ...DEFAULT_WORKSPACE_CONTEXT,
  ...(workspace
    ? {
        vertical:
          normalizeVerticalKey(workspace.vertical, workspace.vertical) ||
          DEFAULT_WORKSPACE_CONTEXT.vertical,
        surfaceMode: workspace.surfaceMode || DEFAULT_WORKSPACE_CONTEXT.surfaceMode,
        featureProfile: workspace.featureProfile || DEFAULT_WORKSPACE_CONTEXT.featureProfile,
        trustProfile: workspace.trustProfile || DEFAULT_WORKSPACE_CONTEXT.trustProfile,
      }
    : {}),
});

const getWorkspaceContextById = async (workspaceId) => {
  if (!workspaceId) return { ...DEFAULT_WORKSPACE_CONTEXT };
  const workspace = await Workspace.findById(workspaceId).select("vertical surfaceMode featureProfile trustProfile");
  return buildWorkspaceContext(workspace);
};

const getAudienceWorkspaceProfile = (audienceType = "") =>
  AUDIENCE_WORKSPACE_PROFILES[normalizeVerticalKey(audienceType)] || null;

const applyAudienceWorkspaceProfile = async (workspaceId, audienceType) => {
  const profile = getAudienceWorkspaceProfile(audienceType);
  if (!workspaceId || !profile) return getWorkspaceContextById(workspaceId);

  await Workspace.findByIdAndUpdate(workspaceId, {
    $set: {
      vertical: profile.vertical,
      surfaceMode: profile.surfaceMode,
      featureProfile: profile.featureProfile,
      trustProfile: profile.trustProfile,
    },
  });

  return { ...profile };
};

module.exports = {
  AUDIENCE_WORKSPACE_PROFILES,
  DEFAULT_WORKSPACE_CONTEXT,
  applyAudienceWorkspaceProfile,
  buildWorkspaceContext,
  getAudienceWorkspaceProfile,
  getWorkspaceContextById,
};
