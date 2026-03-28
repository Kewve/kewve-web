import { User } from "../models/User.js";
import { Buyer } from "../models/Buyer.js";
import { BuyerRequest } from "../models/BuyerRequest.js";
import { normalizeRoles } from "../utils/userRoles.js";

/**
 * One-time style migration: move legacy Buyer documents into users, preserve _id for buyerId FKs.
 * Safe to run repeatedly (no-op when buyers collection is empty).
 */
export async function runDualRoleMigrations(): Promise<void> {
  await migrateBuyersIntoUsers();
  await backfillUserRolesArray();
}

async function migrateBuyersIntoUsers(): Promise<void> {
  const buyers = await Buyer.find({})
    .select("+password +emailVerificationToken +emailVerificationTokenExpiry +resetToken +resetTokenExpiry")
    .exec();

  let migrated = 0;
  for (const buyer of buyers) {
    const b = buyer;
    const existingUser = await User.findOne({ email: b.email });

    if (existingUser) {
      const roles = normalizeRoles(existingUser);
      if (!roles.includes("buyer")) {
        existingUser.roles = [...roles, "buyer"];
        existingUser.emailVerified = !!(existingUser.emailVerified || b.emailVerified);
        if (existingUser.role !== "admin") {
          existingUser.role = existingUser.roles.includes("producer") ? "producer" : "buyer";
        }
        await existingUser.save({ validateBeforeSave: false });
      }
      await BuyerRequest.updateMany({ buyerId: b._id }, { $set: { buyerId: existingUser._id } });
      await Buyer.deleteOne({ _id: b._id });
      migrated++;
      continue;
    }

    const now = new Date();
    await User.collection.insertOne({
      _id: b._id,
      email: b.email,
      password: b.password,
      name: b.name,
      role: "buyer",
      roles: ["buyer"],
      businessName: b.businessName ?? undefined,
      country: b.country ?? undefined,
      discountCodeUsed: b.discountCodeUsed ?? undefined,
      emailVerified: !!b.emailVerified,
      emailVerificationToken: b.emailVerificationToken ?? undefined,
      emailVerificationTokenExpiry: b.emailVerificationTokenExpiry ?? undefined,
      resetToken: b.resetToken ?? undefined,
      resetTokenExpiry: b.resetTokenExpiry ?? undefined,
      createdAt: (b as { createdAt?: Date }).createdAt || now,
      updatedAt: (b as { updatedAt?: Date }).updatedAt || now,
    });
    await Buyer.deleteOne({ _id: b._id });
    migrated++;
  }

  if (migrated > 0) {
    console.log(`Dual-role migration: consolidated ${migrated} legacy buyer record(s) into users.`);
  }
}

async function backfillUserRolesArray(): Promise<void> {
  const users = await User.find({
    $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }],
  });

  let n = 0;
  for (const u of users) {
    const role = String(u.role || "producer");
    u.roles = [role] as string[];
    await u.save({ validateBeforeSave: false });
    n++;
  }

  if (n > 0) {
    console.log(`Dual-role migration: backfilled roles on ${n} user document(s).`);
  }
}
