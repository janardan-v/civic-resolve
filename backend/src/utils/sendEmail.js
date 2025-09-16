import nodemailer from 'nodemailer';
import { ApiError } from './ApiError.js';

// Transporter configuration for a real email service
const transporter = nodemailer.createTransport({
    // For services like Gmail, you can use a predefined service option.
    // For other services, you may need to provide host, port, and secure options.
    // service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: options.email,
            subject: options.subject,
            html: options.message
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.email}`);
    } catch (error) {
        console.error(`Error sending email: ${error.message}`);
        throw new ApiError(500, "There was an issue sending the email. Please try again later.");
    }
};

export { sendEmail };
