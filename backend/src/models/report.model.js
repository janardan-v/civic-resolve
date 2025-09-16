import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const reportSchema = new Schema(
    {
        reportId: {
            type: String,
            default: uuidv4,
            unique: true
        },
        userId: {
            type: String,
            ref: "User",
            required: true
        },
        categoryId: {
            type: String,
            ref: "Category",
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        photo_url: {
            type: String,
            required: true,
            trim: true
        },
        // New field for the completion photo
        completion_photo_url: {
            type: String,
            trim: true
        },
        voice_recording_url: {
            type: String,
            trim: true
        },
        location_lat: {
            type: Number,
            required: true
        },
        location_lng: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'resolved', 'rejected'],
            default: 'pending',
            lowercase: true
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
            lowercase: true
        }
    },
    { timestamps: true , collection: 'reports'}
);

export const Report = mongoose.model('Report', reportSchema);
