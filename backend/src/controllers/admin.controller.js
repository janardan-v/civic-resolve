import { Report } from '../models/report.model.js';
import { ReportAssignment } from '../models/reportAssignment.model.js';
import { ReportHistory } from '../models/reportHistory.model.js';
import { Notification } from '../models/notifications.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { generateAnalytics } from '../utils/analytics.service.js';

// Admin authorization middleware
const isAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "Authentication required");
    }

    if (req.user.role !== 'department_admin' && req.user.role !== 'super_admin') {
        throw new ApiError(403, "Admin access required");
    }

    next();
});

// Update a report's status
const updateReportStatus = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { newStatus, remarks } = req.body;
    const { userId } = req.user;

    if (!newStatus) {
        throw new ApiError(400, "New status is required.");
    }

    const report = await Report.findOne({ reportId });
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    const previousStatus = report.status;

    if (previousStatus === newStatus) {
        throw new ApiError(400, "The report status is already " + newStatus);
    }

    report.status = newStatus;
    await report.save();

    await ReportHistory.create({
        reportId: report.reportId,
        previousStatus: previousStatus,
        newStatus: newStatus,
        changedByUserId: userId,
        remarks: remarks || `Status changed from ${previousStatus} to ${newStatus}.`
    });

    await Notification.create({
        userId: report.userId,
        reportId: report.reportId,
        message: `Your report status has been updated to "${newStatus}".`,
    });
    
    // Trigger live analytics update
    await generateAnalytics();

    return res.status(200).json(
        new ApiResponse(200, report, `Report status updated to ${newStatus}.`)
    );
});

// Assign a report to an official
const assignReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { departmentId, assignedToUserId } = req.body;
    const { userId } = req.user;

    if (!departmentId || !assignedToUserId) {
        throw new ApiError(400, "Department ID and assigned user ID are required.");
    }

    const report = await Report.findOne({ reportId });
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    const newAssignment = await ReportAssignment.create({
        reportId,
        departmentId,
        assigned_to_userId: assignedToUserId,
        assignedByUserId: userId,
        assignedByUserId: userId,
        status: 'assigned',
        remarks: `Report assigned to official.`
    });

    if (!newAssignment) {
        throw new ApiError(500, "Failed to assign report.");
    }

    await ReportHistory.create({
        reportId,
        previousStatus: report.status,
        newStatus: 'in_progress',
        previousStatus: report.status,
        newStatus: 'in_progress',
        changedByUserId: userId,
        remarks: `Report assigned to a department official.`
    });

    await Notification.create({
        userId: assignedToUserId,
        reportId: report.reportId,
        message: `A new report has been assigned to you.`,
    });
    
    // Trigger live analytics update
    await generateAnalytics();

    return res.status(200).json(
        new ApiResponse(200, newAssignment, 'Report assigned successfully.')
    );
});

// New controller function to mark a report as solved and upload a completion photo
const resolveReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { remarks } = req.body;
    const { userId } = req.user;

    if (!req.files || !req.files.completionPhoto || !req.files.completionPhoto[0]) {
        throw new ApiError(400, "A photo of the finished task is required.");
    }

    const completionPhotoLocalPath = req.files.completionPhoto[0].path;
    const uploadedCompletionPhoto = await uploadOnCloudinary(completionPhotoLocalPath);
    if (!uploadedCompletionPhoto) {
        throw new ApiError(500, "Failed to upload completion photo to cloud service.");
    }
    const completionPhotoUrl = uploadedCompletionPhoto.secure_url;

    const report = await Report.findOne({ reportId });
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    const previousStatus = report.status;

    report.status = 'resolved';
    report.completion_photo_url = completionPhotoUrl;
    await report.save();

    await ReportHistory.create({
        reportId: report.reportId,
        previousStatus: previousStatus,
        newStatus: 'resolved',
        changedByUserId: userId,
        remarks: remarks || `Task completed and marked as resolved.`
    });

    await Notification.create({
        userId: report.userId,
        reportId: report.reportId,
        message: `Your report status has been updated to "resolved".`,
    });
    
    // Trigger live analytics update
    await generateAnalytics();

    return res.status(200).json(
        new ApiResponse(200, report, `Report resolved successfully.`)
    );
});

// Placeholder admin controller functions
const getDashboardStats = asyncHandler(async (req, res) => {
    // Placeholder implementation
    const stats = {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        totalUsers: 0
    };

    return res.status(200).json(
        new ApiResponse(200, stats, "Dashboard stats fetched successfully")
    );
});

const getAllUsers = asyncHandler(async (req, res) => {
    // Placeholder implementation
    const users = [];

    return res.status(200).json(
        new ApiResponse(200, users, "Users fetched successfully")
    );
});

const updateUserRole = asyncHandler(async (req, res) => {
    // Placeholder implementation
    return res.status(200).json(
        new ApiResponse(200, {}, "User role updated successfully")
    );
});

const deleteUser = asyncHandler(async (req, res) => {
    // Placeholder implementation
    return res.status(200).json(
        new ApiResponse(200, {}, "User deleted successfully")
    );
});

export {
    isAdmin,
    updateReportStatus,
    assignReport,
    resolveReport,
    getDashboardStats,
    getAllUsers,
    updateUserRole,
    deleteUser
};