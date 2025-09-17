import { Notification } from '../models/notifications.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Report } from '../models/report.model.js';

// Get all notifications for the authenticated user
export const getMyNotifications = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    // Step 1: Find all notifications for the user without populating.
    const notifications = await Notification.find({ userId: userId })
        .sort({ createdAt: -1 })
        .lean(); // Use .lean() to get plain JavaScript objects for efficiency

    if (!notifications || notifications.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], 'No notifications found for this user.')
        );
    }

    // Step 2: Extract all unique report UUIDs from the notifications.
    const reportUUIDs = [...new Set(notifications.map(notification => notification.reportId).filter(id => id))];

    // Step 3: Find all related Report documents in a single, efficient query.
    // The query is on the 'reportId' field, which is a String in your schema.
    const relatedReports = await Report.find({ reportId: { $in: reportUUIDs } })
        .select('reportId title status'); // Only select the fields you need.

    // Step 4: Create a map for quick lookup.
    const reportMap = new Map(relatedReports.map(report => [report.reportId, report]));

    // Step 5: Manually "populate" the notifications with the fetched report details.
    const populatedNotifications = notifications.map(notification => ({
        ...notification,
        reportId: reportMap.get(notification.reportId) || notification.reportId
    }));

    return res.status(200).json(
        new ApiResponse(200, populatedNotifications, 'Notifications fetched successfully.')
    );
});

// Mark a specific notification as read
export const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const { userId } = req.user; // Get userId from authMiddleware

    const notification = await Notification.findOneAndUpdate(
        { notificationId: notificationId, userId: userId }, // Find by notificationId and userId for security
        { status: 'read' },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found or user not authorized.');
    }

    return res.status(200).json(
        new ApiResponse(200, notification, 'Notification marked as read.')
    );
});