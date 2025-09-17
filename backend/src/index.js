import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import cron from 'node-cron';
import { generateAnalytics } from './utils/analytics.service.js';
import { sendPendingReportNotifications } from "./utils/notification.service.js";

// Load environment variables
dotenv.config({
    path: './.env'
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("Express app error:", error);
            throw error;
        });

        app.listen(PORT, () => {
            console.log(`Server is running at port: ${PORT}`);
            console.log(`Login endpoint available at: http://localhost:${PORT}/api/v1/users/login`);

            // Schedule the notification task
            // This cron job will run every 15 minutes
            cron.schedule('*/15 * * * *', async () => {
                console.log('Running pending report notification task...');
                try {
                    await sendPendingReportNotifications();
                    console.log('Notification task completed successfully.');
                } catch (error) {
                    console.error('Error during notification task:', error);
                }
            });
        });
    })
    .catch((error) => {
        console.log("MongoDB connection FAILED:", error);
        process.exit(1);
    });