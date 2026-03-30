/**
 * When a product has at least one compliance document, verification/readiness
 * are derived from document review state. When there are zero documents, the
 * product keeps its existing verification/readiness (legacy products stay live).
 */
export function syncProductComplianceStatus(product: {
  complianceDocuments?: Array<{ status?: string }>;
  verification?: string;
  readiness?: string;
  rejectionReason?: string;
}): void {
  const docs = product.complianceDocuments || [];
  if (docs.length === 0) return;

  if (docs.some((d) => d.status === "rejected")) {
    product.verification = "rejected";
    product.readiness = "pending";
    return;
  }
  if (docs.some((d) => d.status === "pending")) {
    product.verification = "pending";
    product.readiness = "pending";
    product.rejectionReason = "";
    return;
  }
  if (docs.every((d) => d.status === "approved")) {
    product.verification = "verified";
    product.readiness = "approved";
    product.rejectionReason = "";
  }
}

export function stripComplianceDocumentsForClient(
  docs: Array<Record<string, unknown>> | undefined
): Array<Omit<Record<string, unknown>, "data">> {
  if (!docs?.length) return [];
  return docs.map((d) => {
    const { data: _omit, ...rest } = d;
    return rest;
  });
}
