import { Report } from '../models/report.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ReportHistory } from '../models/reportHistory.model.js';
import { Notification } from '../models/notifications.model.js';
import { Category } from '../models/category.model.js';
import { User } from '../models/user.model.js';
import { generateAnalytics } from '../utils/analytics.service.js';

// Submit a new civic issue report
const submitReport = asyncHandler(async (req, res) => {
    const { title, description, categoryId, locationLat, locationLng } = req.body;
    const { userId } = req.user;

    if (!title || !description || !categoryId || !locationLat || !locationLng) {
        throw new ApiError(400, 'All required fields (title, description, categoryId, locationLat, locationLng) are needed for the report.');
    }

    const categoryExists = await Category.findOne({ categoryId });
    if (!categoryExists) {
        throw new ApiError(404, 'The specified categoryId does not exist.');
    }

    if (!req.files || !req.files.photo || !req.files.photo[0]) {
        throw new ApiError(400, 'A photo is required for the report.');
    }

    const photoLocalPath = req.files.photo[0].path;
    const voiceRecordingLocalPath = req.files.voiceRecording?.[0]?.path;

    const uploadedPhoto = await uploadOnCloudinary(photoLocalPath);
    if (!uploadedPhoto) {
        throw new ApiError(500, 'Failed to upload photo to cloud service.');
    }
    const photoUrl = uploadedPhoto.secure_url;

    let voiceRecordingUrl = null;
    if (voiceRecordingLocalPath) {
        const uploadedVoiceRecording = await uploadOnCloudinary(voiceRecordingLocalPath);
        if (!uploadedVoiceRecording) {
            throw new ApiError(500, 'Failed to upload voice recording to cloud service.');
        }
        voiceRecordingUrl = uploadedVoiceRecording.secure_url;
    }

    const newReport = await Report.create({
        userId,
        categoryId,
        title,
        description,
        photo_url: photoUrl,
        voice_recording_url: voiceRecordingUrl,
        location_lat: locationLat,
        location_lng: locationLng
    });

    await ReportHistory.create({
        reportId: newReport.reportId,
        previousStatus: null,
        newStatus: 'pending',
        changedByUserId: userId,
        remarks: 'Report submitted by user.'
    });
    
    // Trigger live analytics update
    await generateAnalytics();

    return res.status(201).json(
        new ApiResponse(201, newReport, 'Report submitted successfully.')
    );
});

// Get reports for logged-in user
const getMyReports = asyncHandler(async (req, res) => {
    // Step 1: Get the logged-in user's UUID from the request object.
    const loggedInUserUUID = req.user.userId;

    // Step 2: Find reports where the 'userId' field (a UUID) matches the logged-in user's UUID.
    const myReports = await Report.find({ userId: loggedInUserUUID })
        .sort({ createdAt: -1 })
        .lean();

    // Step 3: Handle the case where the user has no reports.
    if (!myReports || myReports.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], 'User has not created any reports yet.')
        );
    }

    // Step 4: Collect all unique category UUIDs from these reports.
    const categoryUUIDs = [...new Set(myReports.map(report => report.categoryId).filter(id => id))];

    // Step 5: Find all matching category documents in a single query.
    // NOTE: This assumes the UUID field in your Category model is named 'categoryId'.
    const categories = await Category.find({ categoryId: { $in: categoryUUIDs } })
        .select("name description categoryId");

    // Step 6: Create a map for quick category lookups.
    const categoryMap = new Map(categories.map(category => [category.categoryId, category]));

    // Step 7: Manually populate each report.
    const populatedReports = myReports.map(report => ({
        ...report,
        // Attach the full user object from the request.
        userId: req.user,
        // Replace the category ID with the full category object from our map.
        categoryId: categoryMap.get(report.categoryId) || report.categoryId
    }));

    // Step 8: Send the final, populated data.
    return res.status(200).json(
        new ApiResponse(200, populatedReports, 'User reports fetched successfully.')
    );
});

// Get all reports (admin)
const getAllReports = asyncHandler(async (req, res) => {
    // Step 1: Get all reports as plain objects.
    const reports = await Report.find().sort({ createdAt: -1 }).lean();

    if (!reports || reports.length === 0) {
        throw new ApiError(404, 'No reports found.');
    }

    // Step 2: Collect all unique IDs from the reports.
    const userUUIDs = [...new Set(reports.map(report => report.userId).filter(id => id))];
    const categoryUUIDs = [...new Set(reports.map(report => report.categoryId).filter(id => id))]; // --- New for Category ---

    // Step 3: Find all matching users and categories in parallel for efficiency.
    const [users, categories] = await Promise.all([
        User.find({ userId: { $in: userUUIDs } }).select("username name userId"),
        Category.find({ categoryId: { $in: categoryUUIDs } }).select("name description categoryId") // --- New for Category ---
    ]);

    // Step 4: Create maps for quick lookups.
    const userMap = new Map(users.map(user => [user.userId, user]));
    const categoryMap = new Map(categories.map(category => [category.categoryId, category])); // --- New for Category ---

    // Step 5: Manually replace the IDs in each report with the full objects.
    const populatedReports = reports.map(report => ({
        ...report,
        userId: userMap.get(report.userId) || report.userId,
        categoryId: categoryMap.get(report.categoryId) || report.categoryId // --- New for Category ---
    }));

    return res.status(200).json(
        new ApiResponse(200, populatedReports, 'All reports fetched successfully.')
    );
});

// Get report by reportId
const getReportById = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await Report.findOne({ reportId })
        .populate('userId', 'userId username name email')      // Populate user info
        .populate('categoryId', 'categoryId name description'); // Populate category info

    if (!report) {
        throw new ApiError(404, 'Report not found.');
    }

    return res.status(200).json(
        new ApiResponse(200, report, 'Report fetched successfully.')
    );
});

// Update a report's status and send notification
const updateReportStatus = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { status, description } = req.body;

    if (!status) {
        throw new ApiError(400, "Status is required.");
    }

    const report = await Report.findOne({ reportId });
    if (!report) {
        throw new ApiError(404, "Report not found.");
    }

    report.status = status;
    report.description = description || report.description;
    await report.save();

    const user = await User.findOne({ userId: report.userId });
    if (user) {
        await Notification.create({
            userId: user.userId,
            message: `Your report #${report.reportId} status changed to "${status}".`,
            type: "status_update",
            reportId: report.reportId
        });
    }

    // Trigger live analytics update
    await generateAnalytics();

    return res.status(200).json(
        new ApiResponse(200, report, 'Report status updated successfully and notification sent.')
    );
});

export {
    submitReport,
    updateReportStatus,
    getMyReports,
    getAllReports,
    getReportById
};