const extractDates = (text = "") => {
  const matches = String(text).match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  return [...new Set(matches)];
};

const extractMoney = (text = "") => {
  const matches = String(text).match(/(?:USD|EGP|\$)\s?\d[\d,]*(?:\.\d{1,2})?/gi) || [];
  return [...new Set(matches)];
};

const extractPercentages = (text = "") => {
  const matches = String(text).match(/\b\d{1,3}(?:\.\d+)?%/g) || [];
  return [...new Set(matches)];
};

const summarizeWarnings = ({ text = "", documentType = "" }) => {
  const warnings = [];
  if (String(text).trim().length < 80) warnings.push("Source text is short, so extracted structure may be incomplete.");
  if (["settlement", "claim", "syllabus"].includes(documentType) && !extractDates(text).length) {
    warnings.push("No explicit date was found in the document text.");
  }
  if (["settlement", "report", "claim"].includes(documentType) && !extractMoney(text).length && !extractPercentages(text).length) {
    warnings.push("No money or performance figures were detected in the document text.");
  }
  return warnings.slice(0, 4);
};

const extractStructuredRecord = async ({ documentType = "general", text = "", metadata = {} } = {}) => {
  const dates = extractDates(text);
  const amounts = extractMoney(text);
  const percentages = extractPercentages(text);
  const warnings = summarizeWarnings({ text, documentType });
  const confidenceScore = Math.max(
    42,
    Math.min(
      94,
      62 + dates.length * 8 + (amounts.length + percentages.length) * 6 - warnings.length * 10,
    ),
  );

  return {
    documentType,
    extractedAt: new Date(),
    confidenceScore,
    warnings,
    entities: {
      dates,
      amounts,
      percentages,
    },
    metadata,
  };
};

const extractAgencyReportIntelligence = async ({ text = "", metadata = {} } = {}) =>
  extractStructuredRecord({ documentType: "report", text, metadata });

const extractSettlementIntelligence = async ({ text = "", metadata = {} } = {}) =>
  extractStructuredRecord({ documentType: "settlement", text, metadata });

const extractClaimIntelligence = async ({ text = "", metadata = {} } = {}) =>
  extractStructuredRecord({ documentType: "claim", text, metadata });

const extractStudyDocumentIntelligence = async ({ text = "", metadata = {} } = {}) =>
  extractStructuredRecord({ documentType: "syllabus", text, metadata });

module.exports = {
  extractAgencyReportIntelligence,
  extractClaimIntelligence,
  extractSettlementIntelligence,
  extractStructuredRecord,
  extractStudyDocumentIntelligence,
};
