import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const analyticSchema = new Schema(
    {
        analyticsId: {
            type: String,
            default: uuidv4,
            unique: true
        },
        reportCount: {
            type: Number,
            default: 0
        },
        resolvedCount: {
            type: Number,
            default: 0
        },
        avgResolutionTime: {
            type: Number
        },
        categoryId: { 
            type: String,
            ref: 'Category',
            required: false
        },
        generatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export const Analytic = mongoose.model('Analytic', analyticSchema);