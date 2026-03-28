const STRIPE_ACCT_ID = /^acct_[a-zA-Z0-9]+$/;
export function isValidStripeConnectAccountId(value) {
    const t = String(value || "").trim();
    if (!t)
        return true;
    return STRIPE_ACCT_ID.test(t);
}
export function normalizeRoles(user) {
    if (!user)
        return [];
    const raw = user.roles?.filter((r) => ["producer", "buyer", "admin"].includes(String(r).toLowerCase()));
    if (raw && raw.length > 0)
        return Array.from(new Set(raw.map((r) => r.toLowerCase())));
    const r = String(user.role || "producer").toLowerCase();
    return [r];
}
export function userHasRole(user, role) {
    return normalizeRoles(user).includes(role);
}
/** Buyer catalog: explicit ?catalog=buyer, or buyer-only account. */
export function shouldUseBuyerProductCatalog(user, query) {
    if (!userHasRole(user, "buyer"))
        return false;
    const catalog = String(query.catalog || query.forBuyer || "").toLowerCase();
    if (catalog === "buyer" || catalog === "true" || catalog === "1")
        return true;
    return !userHasRole(user, "producer");
}
export function userPublicJson(user) {
    const roles = normalizeRoles(user);
    const primaryRole = roles.includes("admin")
        ? "admin"
        : roles.includes("producer")
            ? "producer"
            : roles[0] || "producer";
    let buyerDelivery;
    if (userHasRole(user, "buyer") && user.savedDeliveryAddress) {
        const s = user.savedDeliveryAddress;
        const line1 = String(s.line1 || "").trim();
        const city = String(s.city || "").trim();
        const postalCode = String(s.postalCode || "").trim();
        const country = String(s.country || "").trim();
        if (line1 && city && postalCode && country) {
            buyerDelivery = {
                line1,
                line2: String(s.line2 || "").trim(),
                city,
                postalCode,
                country,
                phone: String(s.phone || "").trim(),
                company: String(s.company || "").trim(),
            };
        }
    }
    const idStr = user._id?.toString?.() ?? String(user._id);
    const profileCountry = String(user.country ?? "").trim();
    if (userHasRole(user, "producer")) {
        return {
            id: idStr,
            email: user.email,
            name: user.name,
            role: primaryRole,
            roles,
            emailVerified: !!user.emailVerified,
            businessName: user.businessName,
            country: profileCountry,
            discountCodeUsed: user.discountCodeUsed,
            stripeConnectAccountId: String(user.stripeConnectAccountId || "").trim() || "",
            ...(buyerDelivery ? { savedDeliveryAddress: buyerDelivery } : {}),
        };
    }
    return {
        id: idStr,
        email: user.email,
        name: user.name,
        role: primaryRole,
        roles,
        emailVerified: !!user.emailVerified,
        businessName: user.businessName,
        country: profileCountry,
        discountCodeUsed: user.discountCodeUsed,
        ...(buyerDelivery ? { savedDeliveryAddress: buyerDelivery } : {}),
    };
}
