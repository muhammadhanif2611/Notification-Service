import { z } from 'zod';
import { CHANNELS } from './constants.js';

// Skema validasi request pengiriman notifikasi
export const sendNotificationSchema = z.object({
  channel: z.enum([CHANNELS.WHATSAPP, CHANNELS.EMAIL]),
  recipient: z.string().min(1, 'Recipient phone number or email is required'),
  subject: z.string().optional(),
  body: z.string().optional(),
  templateCode: z.string().optional(),
  variables: z.record(z.string()).optional()
}).refine(data => data.body || data.templateCode, {
  message: 'Either body or templateCode must be provided',
  path: ['body']
});

// Skema validasi request pembuatan project baru
export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  rateLimitPerMin: z.number().int().positive().default(100),
  dailyQuota: z.number().int().positive().default(5000),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional()
});

// Skema validasi request pembuatan API Key baru
export const createApiKeySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, 'API Key name is required'),
  environment: z.enum(['production', 'sandbox']).default('production')
});

// Skema validasi request pembuatan template baru
export const createTemplateSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(2),
  code: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Template code must contain lowercase letters, numbers, and underscores'),
  channel: z.enum([CHANNELS.WHATSAPP, CHANNELS.EMAIL]),
  subject: z.string().optional(),
  body: z.string().min(1, 'Template body is required'),
  variables: z.array(z.string()).default([])
});

// Skema validasi request pembuatan vendor baru
export const createVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  channel: z.enum([CHANNELS.WHATSAPP, CHANNELS.EMAIL]),
  credentials: z.record(z.string(), z.unknown()).refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'Credentials object must not be empty' }
  ),
  priority: z.number().int().min(1).max(10).default(1)
});
