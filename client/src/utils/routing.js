import { CANONICAL_VERTICALS, normalizeVerticalKey } from "../data/verticals";

export const getDefaultAuthenticatedPath = (user) => {
  const surfaceMode = user?.workspaceContext?.surfaceMode;
  if (surfaceMode === CANONICAL_VERTICALS.STUDENT) {
    return "/today";
  }

  const vertical = normalizeVerticalKey(user?.workspaceContext?.vertical, CANONICAL_VERTICALS.CORE);
  if (vertical === CANONICAL_VERTICALS.AGENCIES) {
    return "/agency/dashboard";
  }
  if (vertical === CANONICAL_VERTICALS.REAL_ESTATE) {
    return "/real-estate/dashboard";
  }

  return "/dashboard";
};
