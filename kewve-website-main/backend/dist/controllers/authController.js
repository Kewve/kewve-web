import crypto from "crypto";
import { User } from "../models/User.js";
import { generateToken } from "../middleware/auth.js";
import { DiscountCode } from "../models/DiscountCode.js";
import { isValidStripeConnectAccountId, normalizeRoles, userHasRole, userPublicJson } from "../utils/userRoles.js";
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const getEmailVerificationSecret = () => {
    return (process.env.EMAIL_VERIFICATION_SECRET ||
        process.env.JWT_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.SMTP_PASS ||
        "");
};
const createPendingBuyerVerificationToken = (payload) => {
    const secret = getEmailVerificationSecret();
    if (!secret) {
        throw new Error("Email verification secret is not configured.");
    }
    const tokenPayload = {
        ...payload,
        exp: Date.now() + EMAIL_VERIFICATION_TTL_MS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
    return `${encodedPayload}.${signature}`;
};
const verifyPendingBuyerVerificationToken = (token) => {
    const secret = getEmailVerificationSecret();
    if (!secret) {
        return { valid: false, error: "Email verification is temporarily unavailable." };
    }
    const parts = token.split(".");
    if (parts.length !== 2) {
        return { valid: false, error: "Invalid or expired verification link." };
    }
    const [encodedPayload, providedSignature] = parts;
    const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
    if (providedSignature.length !== expectedSignature.length) {
        return { valid: false, error: "Invalid or expired verification link." };
    }
    const signaturesMatch = crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
    if (!signaturesMatch) {
        return { valid: false, error: "Invalid or expired verification link." };
    }
    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
        if (!payload.exp || Date.now() > payload.exp) {
            return { valid: false, error: "Invalid or expired verification link." };
        }
        if (!payload.email || !payload.password || !payload.name || payload.role !== "buyer") {
            return { valid: false, error: "Invalid or expired verification link." };
        }
        return { valid: true, payload };
    }
    catch {
        return { valid: false, error: "Invalid or expired verification link." };
    }
};
export const register = async (req, res) => {
    try {
        const { email, password, name, role, businessName, country, discountCodeUsed } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                success: false,
                message: "Email, password, and name are required",
            });
            return;
        }
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        const normalizedRole = String(role || "producer").toLowerCase() === "buyer" ? "buyer" : "producer";
        if (existing) {
            if (normalizedRole === "buyer") {
                if (userHasRole(existing, "buyer")) {
                    res.status(400).json({
                        success: false,
                        message: "User with this email already exists",
                    });
                    return;
                }
                res.status(409).json({
                    success: false,
                    message: "An account with this email already exists. Log in as a producer and use “Buyer signup” in the header to add buyer access.",
                });
                return;
            }
            if (userHasRole(existing, "producer")) {
                res.status(400).json({
                    success: false,
                    message: "User with this email already exists",
                });
                return;
            }
            res.status(409).json({
                success: false,
                message: "An account with this email already exists. Log in as a buyer and use “Producer dashboard” in the buyer portal to add producer access (payment required).",
            });
            return;
        }
        const normalizedDiscountCode = discountCodeUsed?.toUpperCase().trim();
        if (normalizedDiscountCode) {
            const code = await DiscountCode.findOne({ code: normalizedDiscountCode, isActive: true });
            if (!code) {
                res.status(400).json({
                    success: false,
                    message: "Invalid or inactive discount code",
                });
                return;
            }
        }
        const requiresEmailVerification = normalizedRole === "buyer";
        const roles = normalizedRole === "buyer" ? ["buyer"] : ["producer"];
        if (requiresEmailVerification) {
            const emailVerificationToken = createPendingBuyerVerificationToken({
                email: normalizedEmail,
                password,
                name,
                role: "buyer",
                businessName,
                country,
                discountCodeUsed: normalizedDiscountCode || undefined,
            });
            res.status(201).json({
                success: true,
                message: "Buyer registration started. Please verify your email to activate login.",
                data: {
                    requiresEmailVerification: true,
                    emailVerificationToken,
                },
            });
            return;
        }
        const user = await User.create({
            email: normalizedEmail,
            password,
            name,
            role: normalizedRole,
            roles: [...roles],
            emailVerified: !requiresEmailVerification,
            emailVerificationToken: undefined,
            emailVerificationTokenExpiry: undefined,
            businessName,
            country,
            discountCodeUsed: normalizedDiscountCode || undefined,
        });
        if (normalizedDiscountCode) {
            await DiscountCode.updateOne({ code: normalizedDiscountCode }, { $inc: { usageCount: 1 } });
        }
        const token = generateToken(user._id.toString());
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: userPublicJson(user),
                token,
                requiresEmailVerification: false,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again.",
        });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password, expectedRole } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        if (expectedRole === "buyer" && !userHasRole(user, "buyer")) {
            res.status(403).json({
                success: false,
                message: "This account does not have buyer access. Log in from the main login page and enable buyer access from your producer dashboard, or register as a buyer with a different email.",
            });
            return;
        }
        if (expectedRole === "producer" && !userHasRole(user, "producer")) {
            res.status(403).json({
                success: false,
                message: "This account does not have producer access. Use the buyer dashboard to complete producer signup (payment), or register as a producer.",
            });
            return;
        }
        const buyerOnly = userHasRole(user, "buyer") && !userHasRole(user, "producer") && !userHasRole(user, "admin");
        if (buyerOnly && !user.emailVerified) {
            res.status(403).json({
                success: false,
                message: "Please verify your email address before logging in.",
            });
            return;
        }
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userPublicJson(user),
                token,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed. Please try again.",
        });
    }
};
export const getCurrentUser = async (req, res) => {
    try {
        const authReq = req;
        const tokenUser = authReq.user;
        if (!tokenUser) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const user = await User.findById(tokenUser._id);
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User not found. Please log in again.",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                user: userPublicJson(user),
            },
        });
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user information",
        });
    }
};
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ success: false, message: "Verification token is required." });
            return;
        }
        const legacyUser = await User.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpiry: { $gt: new Date() },
        }).select("+emailVerificationToken +emailVerificationTokenExpiry");
        if (legacyUser) {
            legacyUser.emailVerified = true;
            legacyUser.emailVerificationToken = undefined;
            legacyUser.emailVerificationTokenExpiry = undefined;
            await legacyUser.save({ validateBeforeSave: false });
            res.status(200).json({
                success: true,
                message: "Email verified successfully. You can now log in.",
                data: {
                    user: userPublicJson(legacyUser),
                },
            });
            return;
        }
        const verified = verifyPendingBuyerVerificationToken(token);
        if (!verified.valid) {
            res.status(400).json({
                success: false,
                message: verified.error,
            });
            return;
        }
        const pending = verified.payload;
        const existing = await User.findOne({ email: pending.email });
        if (existing) {
            if (userHasRole(existing, "buyer")) {
                res.status(400).json({
                    success: false,
                    message: "This email is already registered as a buyer. Please log in.",
                });
                return;
            }
            res.status(409).json({
                success: false,
                message: "An account with this email already exists. Log in as a producer and use “Buyer signup” in the header to add buyer access.",
            });
            return;
        }
        const normalizedDiscountCode = pending.discountCodeUsed?.toUpperCase().trim();
        if (normalizedDiscountCode) {
            const code = await DiscountCode.findOne({ code: normalizedDiscountCode, isActive: true });
            if (!code) {
                res.status(400).json({
                    success: false,
                    message: "Invalid or inactive discount code",
                });
                return;
            }
        }
        const user = await User.create({
            email: pending.email.toLowerCase().trim(),
            password: pending.password,
            name: pending.name,
            role: "buyer",
            roles: ["buyer"],
            emailVerified: true,
            emailVerificationToken: undefined,
            emailVerificationTokenExpiry: undefined,
            businessName: pending.businessName,
            country: pending.country,
            discountCodeUsed: normalizedDiscountCode || undefined,
        });
        if (normalizedDiscountCode) {
            await DiscountCode.updateOne({ code: normalizedDiscountCode }, { $inc: { usageCount: 1 } });
        }
        res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now log in.",
            data: {
                user: userPublicJson(user),
            },
        });
    }
    catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify email. Please try again.",
        });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user) {
            res.status(401).json({ success: false, message: "User not authenticated" });
            return;
        }
        const body = (req.body || {});
        const { name, stripeConnectAccountId } = body;
        let updated = false;
        if (Object.prototype.hasOwnProperty.call(body, "savedDeliveryAddress")) {
            if (!userHasRole(user, "buyer")) {
                res.status(403).json({ success: false, message: "Only buyers can save delivery details." });
                return;
            }
            const raw = body.savedDeliveryAddress;
            if (raw === null) {
                user.savedDeliveryAddress = undefined;
                updated = true;
            }
            else if (raw !== undefined && typeof raw === "object" && raw !== null) {
                const o = raw;
                const line1 = String(o.line1 ?? "").trim().slice(0, 500);
                const line2 = String(o.line2 ?? "").trim().slice(0, 500);
                const city = String(o.city ?? "").trim().slice(0, 200);
                const postalCode = String(o.postalCode ?? "").trim().slice(0, 64);
                const country = String(o.country ?? "").trim().slice(0, 120);
                const phone = String(o.phone ?? "").trim().slice(0, 80);
                const company = String(o.company ?? "").trim().slice(0, 200);
                if (!line1 || !city || !postalCode || !country) {
                    res.status(400).json({
                        success: false,
                        message: "savedDeliveryAddress requires line1, city, postalCode, and country.",
                    });
                    return;
                }
                user.savedDeliveryAddress = {
                    line1,
                    line2,
                    city,
                    postalCode,
                    country,
                    phone,
                    company,
                };
                updated = true;
            }
        }
        if (name !== undefined) {
            const n = String(name).trim();
            if (!n) {
                res.status(400).json({ success: false, message: "Name cannot be empty" });
                return;
            }
            user.name = n;
            updated = true;
        }
        if (stripeConnectAccountId !== undefined) {
            if (!userHasRole(user, "producer")) {
                res.status(403).json({ success: false, message: "Only producers can set a Stripe Connect account id." });
                return;
            }
            const raw = String(stripeConnectAccountId).trim();
            if (!isValidStripeConnectAccountId(raw)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid Connect account id. It must look like acct_xxxxxxxx (from Stripe Dashboard → Connect).",
                });
                return;
            }
            user.stripeConnectAccountId = raw;
            updated = true;
        }
        if (Object.prototype.hasOwnProperty.call(body, "country")) {
            if (!userHasRole(user, "buyer") && !userHasRole(user, "producer")) {
                res.status(403).json({
                    success: false,
                    message: "Profile country can only be updated for buyer or producer accounts.",
                });
                return;
            }
            user.country = String(body.country ?? "").trim().slice(0, 120);
            updated = true;
        }
        if (!updated) {
            res.status(400).json({ success: false, message: "Nothing to update." });
            return;
        }
        await user.save({ validateBeforeSave: false });
        const persisted = await User.findById(user._id);
        if (!persisted) {
            res.status(500).json({ success: false, message: "Failed to load profile after save." });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: userPublicJson(persisted),
            },
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};
export const enableBuyerRole = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user) {
            res.status(401).json({ success: false, message: "User not authenticated" });
            return;
        }
        if (userHasRole(user, "buyer")) {
            res.status(400).json({
                success: false,
                message: "Buyer access is already enabled for this account.",
            });
            return;
        }
        user.roles = [...normalizeRoles(user), "buyer"];
        if (user.role !== "admin") {
            user.role = user.roles.includes("producer") ? "producer" : "buyer";
        }
        await user.save({ validateBeforeSave: false });
        res.status(200).json({
            success: true,
            message: "Buyer access enabled.",
            data: { user: userPublicJson(user) },
        });
    }
    catch (error) {
        console.error("enableBuyerRole error:", error);
        res.status(500).json({ success: false, message: "Failed to enable buyer access." });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            res.status(200).json({
                success: true,
                message: "If an account with that email exists, a reset link has been sent.",
            });
            return;
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save({ validateBeforeSave: false });
        res.status(200).json({
            success: true,
            message: "If an account with that email exists, a reset link has been sent.",
            data: { resetToken, email: user.email, name: user.name },
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process password reset request.",
        });
    }
};
export const upgradeBuyerFromPayment = async (req, res) => {
    try {
        const headerSecret = req.headers["x-internal-secret"];
        const secret = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
        if (!secret || secret !== process.env.INTERNAL_BUYER_UPGRADE_SECRET) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }
        const { buyerId, customerEmail, discountCode } = req.body;
        if (!buyerId || !customerEmail) {
            res.status(400).json({ success: false, message: "Invalid upgrade payload." });
            return;
        }
        const normalizedEmail = String(customerEmail).toLowerCase().trim();
        const user = await User.findById(buyerId).select("+password");
        if (!user || user.email !== normalizedEmail) {
            res.status(400).json({ success: false, message: "Invalid upgrade request." });
            return;
        }
        if (!userHasRole(user, "buyer")) {
            res.status(400).json({ success: false, message: "Account is not eligible for this upgrade path." });
            return;
        }
        const normalizedDiscountCode = discountCode?.toUpperCase().trim();
        if (normalizedDiscountCode) {
            const code = await DiscountCode.findOne({ code: normalizedDiscountCode, isActive: true });
            if (!code) {
                res.status(400).json({ success: false, message: "Invalid or inactive discount code" });
                return;
            }
        }
        if (userHasRole(user, "producer")) {
            const token = generateToken(user._id.toString());
            res.status(200).json({
                success: true,
                message: "Producer access already active",
                data: {
                    user: userPublicJson(user),
                    token,
                },
            });
            return;
        }
        user.roles = Array.from(new Set([...normalizeRoles(user), "producer"]));
        if (user.role !== "admin")
            user.role = "producer";
        if (normalizedDiscountCode) {
            user.discountCodeUsed = normalizedDiscountCode;
            await DiscountCode.updateOne({ code: normalizedDiscountCode }, { $inc: { usageCount: 1 } });
        }
        await user.save({ validateBeforeSave: false });
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Upgrade successful",
            data: {
                user: userPublicJson(user),
                token,
            },
        });
    }
    catch (error) {
        console.error("Upgrade buyer error:", error);
        res.status(500).json({ success: false, message: "Upgrade failed. Please try again." });
    }
};
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            res.status(400).json({ success: false, message: "Token and new password are required" });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
            return;
        }
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() },
        }).select("+resetToken +resetTokenExpiry +password");
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset token. Please request a new reset link.",
            });
            return;
        }
        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password has been reset successfully.",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password.",
        });
    }
};
