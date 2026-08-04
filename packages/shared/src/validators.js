import { z } from 'zod';
import { CHANNELS } from './constants.js';

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

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  rateLimitPerMin: z.number().int().positive().default(100),
  dailyQuota: z.number().int().positive().default(5000),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional()
});

export const createApiKeySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, 'API Key name is required'),
  environment: z.enum(['production', 'sandbox']).default('production')
});

export const createTemplateSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(2),
  code: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Template code must contain lowercase letters, numbers, and underscores'),
  channel: z.enum([CHANNELS.WHATSAPP, CHANNELS.EMAIL]),
  subject: z.string().optional(),
  body: z.string().min(1, 'Template body is required'),
  variables: z.array(z.string()).default([])
});
