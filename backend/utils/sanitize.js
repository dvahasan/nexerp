/**
 * Redact sensitive company fields before sending a Company document to a client.
 * API keys are only included for users who can manage the company (Settings page);
 * everyone else gets the company without them.
 */
const sanitizeCompany = (company, perms) => {
  if (!company) return company;
  const c = typeof company.toObject === "function" ? company.toObject() : { ...company };
  if (!perms?.canManageCompany) delete c.apiKeys;
  return c;
};

module.exports = { sanitizeCompany };
