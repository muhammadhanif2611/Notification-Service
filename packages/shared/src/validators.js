import { z } from 'zod';
import { CHANNELS, VENDOR_PROVIDERS } from './constants.js';

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

// Skema kredensial vendor Nodemailer (SMTP) — satu-satunya vendor yang dikelola.
// WhatsApp memakai Baileys dan TIDAK memakai vendor credentials, sehingga
// tabel vendors saat ini khusus untuk konfigurasi SMTP Email.
export const nodemailerCredentialsSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.coerce.number().int().positive().default(587),
  secure: z.coerce.boolean().default(false),
  user: z.string().min(1, 'SMTP user is required'),
  pass: z.string().min(1, 'SMTP password is required'),
  from: z.string().optional()
});

// Skema validasi update project (semua opsional)
export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().optional().nullable(),
  rateLimitPerMin: z.number().int().positive().optional(),
  dailyQuota: z.number().int().positive().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional().nullable()
});

// Skema validasi update API Key (rename label)
export const updateApiKeySchema = z.object({
  name: z.string().min(2, 'API key name must be at least 2 characters')
});

// Skema validasi update isi template
export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  subject: z.string().optional().nullable(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional()
});

// Skema validasi request pembuatan vendor Email (Nodemailer SMTP)
export const createVendorSchema = z.object({
  provider: z.literal(VENDOR_PROVIDERS.NODEMAILER).default(VENDOR_PROVIDERS.NODEMAILER),
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  channel: z.literal(CHANNELS.EMAIL).default(CHANNELS.EMAIL),
  credentials: nodemailerCredentialsSchema,
  priority: z.number().int().min(1).max(10).default(1)
});
