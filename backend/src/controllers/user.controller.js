import { User } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';
import {sendEmail} from '../utils/sendEmail.js';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

// Helper function to generate tokens
const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    console.log("Received data from frontend:", req.body); 
    const { username, name, email, password, phoneNumber } = req.body;

    if (!username || !name || !email || !password || !phoneNumber) {
        throw new ApiError(400, 'All required fields are needed for registration.');
    }

    if (!passwordRegex.test(password)) {
        throw new ApiError(400, 'Password does not meet complexity requirements.');
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        throw new ApiError(409, 'Username or email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        username,
        name,
        email,
        passwordHash: hashedPassword, // Changed to match your schema
        role: 'citizen',
        phoneNumber
    });

    if (!newUser) {
        throw new ApiError(500, 'User creation failed on the server.');
    }

    return res.status(201).json(
        new ApiResponse(201, newUser, 'User registered successfully!')
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    // Select passwordHash field explicitly
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    console.log('User found:', {
        id: user._id,
        email: user.email,
        hasPassword: !!user.passwordHash,
        passwordType: typeof user.passwordHash,
        passwordValue: user.passwordHash ? 'exists' : 'missing/null'
    });

    // Check if user has a valid passwordHash field
    if (!user.passwordHash || user.passwordHash === '' || user.passwordHash === null || user.passwordHash === undefined) {
        console.error('User found but passwordHash field is invalid:', {
            userId: user._id,
            email: user.email,
            passwordHashField: user.passwordHash,
            passwordType: typeof user.passwordHash
        });
        throw new ApiError(500, 'User account has no valid password. Please contact support or reset your password.');
    }

    console.log('Comparing password for user:', user.email);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Convert legacy 'user' role to 'citizen' without saving to avoid validation error
    let userRole = user.role;
    if (user.role === 'user') {
        userRole = 'citizen';
        // Update the role in database using direct update to bypass validation
        await User.updateOne(
            { _id: user._id }, 
            { $set: { role: 'citizen' } }
        );
        user.role = 'citizen'; // Update in memory for token generation
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token separately to avoid validation issues
    await User.updateOne(
        { _id: user._id }, 
        { $set: { refreshToken: refreshToken } }
    );

    // Remove sensitive data before sending response
    const userResponse = user.toObject();
    userResponse.role = userRole; // Ensure response shows the updated role
    delete userResponse.passwordHash;
    delete userResponse.refreshToken;

    const options = { httpOnly: true, secure: true };
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: userResponse, accessToken, refreshToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = { httpOnly: true, secure: true };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request. Refresh token is missing.");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    const options = { httpOnly: true, secure: true };
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { user } = req;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both old and new password are required");
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new ApiError(400, "Old password is not correct");
    }

    if (!passwordRegex.test(newPassword)) {
        throw new ApiError(400, "New password does not meet complexity requirements");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { passwordHash: hashedPassword });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required to reset password.");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found with that email address.");
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested a password reset. Please click on this link to reset your password: \n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message
        });

        res.status(200).json(
            new ApiResponse(200, {}, `Password reset link sent to ${email}.`)
        );
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw error;
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset token.");
    }

    const { newPassword } = req.body;
    if (!newPassword || !passwordRegex.test(newPassword)) {
        throw new ApiError(400, 'New password does not meet complexity requirements.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password has been reset successfully.")
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    forgotPassword,
    resetPassword
};