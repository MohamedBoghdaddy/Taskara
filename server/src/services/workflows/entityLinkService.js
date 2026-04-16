const LEGACY_ENTITY_KIND_MAP = {
  candidateId: "candidate",
  initiativeId: "initiative",
  accountId: "agency_account",
  leadId: "lead",
  documentChecklistId: "document_checklist",
  projectId: "project",
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normalizeEntityLink = (link = {}) => {
  if (!link.kind || link.id === undefined || link.id === null || link.id === "") return null;
  return {
    kind: String(link.kind).trim(),
    id: link.id,
    label: String(link.label || "").trim(),
    metadata: link.metadata || {},
  };
};

const dedupeEntityLinks = (links = []) => {
  const unique = [];
  const seen = new Set();
  ensureArray(links)
    .map(normalizeEntityLink)
    .filter(Boolean)
    .forEach((link) => {
      const key = `${link.kind}:${String(link.id)}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(link);
    });
  return unique;
};

const buildEntityLinksFromRefs = (entityRefs = {}, labels = {}) =>
  dedupeEntityLinks(
    Object.entries(LEGACY_ENTITY_KIND_MAP).map(([legacyKey, kind]) => ({
      kind,
      id: entityRefs[legacyKey],
      label: labels[legacyKey] || labels[kind] || "",
    })),
  );

const mergeEntityLinks = (...collections) => dedupeEntityLinks(collections.flatMap((entry) => ensureArray(entry)));

const findEntityLink = (itemOrLinks, kind) => {
  const links = Array.isArray(itemOrLinks) ? itemOrLinks : itemOrLinks?.entityLinks || [];
  return ensureArray(links).find((link) => link.kind === kind) || null;
};

const getEntityId = (item, kind) => {
  const linked = findEntityLink(item, kind);
  if (linked?.id) return linked.id;

  const legacyKey = Object.entries(LEGACY_ENTITY_KIND_MAP).find(([, mappedKind]) => mappedKind === kind)?.[0];
  return legacyKey ? item?.entityRefs?.[legacyKey] || null : null;
};

const getPrimaryEntityLink = (item) => {
  const links = ensureArray(item?.entityLinks);
  if (links.length) return links[0];

  const legacyLinks = buildEntityLinksFromRefs(item?.entityRefs || {});
  return legacyLinks[0] || null;
};

const buildGroupAnchor = (item) => {
  const primary = getPrimaryEntityLink(item);
  return primary?.id ? String(primary.id) : String(item?._id || "");
};

module.exports = {
  LEGACY_ENTITY_KIND_MAP,
  buildEntityLinksFromRefs,
  buildGroupAnchor,
  dedupeEntityLinks,
  findEntityLink,
  getEntityId,
  getPrimaryEntityLink,
  mergeEntityLinks,
};
