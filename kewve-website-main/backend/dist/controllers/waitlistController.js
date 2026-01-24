import { addToWaitlist } from "../service/waitlistService.js";
export const submitWaitlist = async (req, res) => {
    try {
        const { businessName, contactName, email, country, productCategory, exportInterest } = req.body;
        // Validate required fields
        if (!businessName || !contactName || !email || !country || !productCategory || !exportInterest) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: businessName, contactName, email, country, productCategory, and exportInterest"
            });
        }
        // Validate exportInterest value
        if (exportInterest !== "Yes" && exportInterest !== "Exploring" && exportInterest !== "No") {
            return res.status(400).json({
                success: false,
                message: "exportInterest must be either 'Yes', 'Exploring', or 'No'"
            });
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
        const waitlistEntry = await addToWaitlist({
            businessName,
            contactName,
            email,
            country,
            productCategory,
            exportInterest
        });
        res.status(201).json({
            success: true,
            message: "Successfully added to waitlist",
            data: waitlistEntry
        });
    }
    catch (error) {
        // Handle duplicate email error
        if (error.message && error.message.includes("already registered")) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        // Handle validation errors from Mongoose
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: errors.join(", ")
            });
        }
        console.error("Waitlist submission error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};
