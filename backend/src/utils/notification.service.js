import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notifications.model.js";
import { sendEmail } from "./sendEmail.js";

const sendPendingReportNotifications = async () => {
    try {
        console.log("Checking for pending reports to send notifications...");

        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const pendingReports = await Report.find({
            status: "pending",
            createdAt: { $lte: twoDaysAgo }
        }).populate("assignedTo");

        if (pendingReports.length === 0) {
            console.log("No pending reports older than 48 hours found.");
            return;
        }

        for (const report of pendingReports) {
            if (report.assignedTo) {
                const assignedUser = await User.findById(report.assignedTo);
                if (assignedUser) {
                    const notificationMessage = `Reminder: Report #${report.reportId} has been pending for over 48 hours. Please take action.`;
                    
                    // Create a new notification entry
                    await Notification.create({
                        userId: assignedUser._id,
                        message: notificationMessage,
                        type: "reminder",
                        reportId: report._id
                    });

                    // Send an email notification
                    await sendEmail(
                        assignedUser.email,
                        "Pending Report Reminder",
                        notificationMessage
                    );

                    console.log(`Notification and email sent for report ${report.reportId} to user ${assignedUser.username}.`);
                }
            }
        }
        console.log("Notification task completed.");
    } catch (error) {
        console.error("Error in notification service:", error);
    }
};

export { sendPendingReportNotifications };