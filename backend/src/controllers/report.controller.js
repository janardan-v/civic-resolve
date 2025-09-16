import { Report } from '../models/report.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ReportHistory } from '../models/reportHistory.model.js';
import { Notification } from '../models/notifications.model.js';
import { Category } from '../models/category.model.js';
import { User } from '../models/user.model.js';

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

    return res.status(201).json(
        new ApiResponse(201, newReport, 'Report submitted successfully.')
    );
});

// Get reports for logged-in user
const getMyReports = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const reports = await Report.find({ userId })
        .populate('categoryId', 'categoryId name description')  // Populate category info
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, reports, 'Reports fetched successfully.')
    );
});

// Get all reports (admin)
const getAllReports = asyncHandler(async (req, res) => {
    console.log('Entered getAllReports controller');

    const reports = await Report.find()
        // .populate('userId', 'userId username name email')      // Populate user info
        // .populate('categoryId', 'categoryId name description') // Populate category info
        .sort({ createdAt: -1 });

    console.log(`Fetched ${reports.length} reports from DB.`);

    return res.status(200).json(
        new ApiResponse(200, reports, 'All reports fetched successfully.')
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



