import { Router } from 'express';
import { submitReport, getMyReports, getReportById, getAllReports } from '../controllers/report.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { uploadFiles, handleMulterError } from '../middlewares/upload.middleware.js';

const router = Router();

// Protected routes - require authentication
router.use(authMiddleware);

// Submit new report
router.route('/submit').post(uploadFiles, handleMulterError, submitReport);

// Get user's reports
router.route('/my-reports').get(getMyReports);

// Get all reports - Public route
router.route('/all').get(getAllReports);

// Get specific report by ID
router.route('/:reportId').get(getReportById);

export default router;
