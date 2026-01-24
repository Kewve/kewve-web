import { Waitlist } from "../models/Waitlist.js";
export const addToWaitlist = async (data) => {
    try {
        // Check if email already exists
        const existingEntry = await Waitlist.findOne({ email: data.email.toLowerCase() });
        if (existingEntry) {
            throw new Error("This email is already registered in our waitlist");
        }
        const waitlistEntry = new Waitlist({
            businessName: data.businessName,
            contactName: data.contactName,
            email: data.email.toLowerCase(),
            country: data.country,
            productCategory: data.productCategory,
            exportInterest: data.exportInterest,
        });
        const savedEntry = await waitlistEntry.save();
        return {
            id: savedEntry._id.toString(),
            businessName: savedEntry.businessName,
            contactName: savedEntry.contactName,
            email: savedEntry.email,
            country: savedEntry.country,
            productCategory: savedEntry.productCategory,
            exportInterest: savedEntry.exportInterest,
            createdAt: savedEntry.createdAt,
            updatedAt: savedEntry.updatedAt,
        };
    }
    catch (error) {
        if (error.code === 11000) {
            throw new Error("This email is already registered in our waitlist");
        }
        throw error;
    }
};
