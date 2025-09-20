// Make sure all necessary models are imported at the top of the file
import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notifications.model.js";
import { ReportAssignment } from "../models/reportAssignment.model.js";
import { sendEmail } from "./sendEmail.js";

const sendPendingReportNotifications = async () => {
    try {
        console.log("Checking for pending reports to send notifications...");

        // Step 1: Find all reports that are pending and older than two days.
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const oldPendingReports = await Report.find({
            status: "pending",
            createdAt: { $lte: twoDaysAgo }
        }).lean(); // Use .lean() for a faster, read-only query

        if (oldPendingReports.length === 0) {
            console.log("No pending reports older than 48 hours found.");
            return;
        }

        // Step 2: Get the UUIDs of these reports to find their assignments.
        const reportUUIDs = oldPendingReports.map(report => report.reportId);

        // Step 3: Find all the assignments related to these specific reports.
        const assignments = await ReportAssignment.find({
            reportId: { $in: reportUUIDs }
        }).lean();

        if (assignments.length === 0) {
            console.log("Found old pending reports, but they have no assignments.");
            return;
        }

        // Step 4: Gather all unique user UUIDs from the assignments.
        const userUUIDs = [...new Set(assignments.map(a => a.assigned_to_userId).filter(id => id))];

        // Step 5: Fetch all the assigned users' details in one efficient query.
        const users = await User.find({ userId: { $in: userUUIDs } })
            .select("userId username email") // Select only necessary fields        
            .lean();

        // Step 6: Create maps for easy and fast lookups inside the loop.
        const userMap = new Map(users.map(user => [user.userId, user]));
        const reportMap = new Map(oldPendingReports.map(report => [report.reportId, report]));

        // Step 7: Loop through the assignments and send notifications.
        for (const assignment of assignments) {
            const assignedUser = userMap.get(assignment.assigned_to_userId);
            const report = reportMap.get(assignment.reportId);

            if (assignedUser && report) {
                const notificationMessage = `Reminder: Report titled "${report.title}" has been pending for over 48 hours. Please take action.`;

                // Create a new notification entry in the database
                await Notification.create({
                    userId: assignedUser.userId, // Use the user's Id for the reference
                    message: notificationMessage,
                    type: "reminder",
                    reportId: report.reportId // Use the report's Id for the reference
                });

                // Send an email notification
                if (assignedUser && report && assignedUser.email) {
                    await sendEmail({
                        email: assignedUser.email,
                        subject: "Pending Report Reminder",
                        message: notificationMessage
                    });

                    console.log(`Notification sent for report "${report.title}" to user ${assignedUser.username}.`);

                } else {
                    console.log(`Skipping notification for report "${report.title}" due to missing user details or email.`);
                }
            }
        }
        console.log("Notification task completed.");
    } catch (error) {
        console.error("Error in notification service:", error);
    }
};

export { sendPendingReportNotifications };