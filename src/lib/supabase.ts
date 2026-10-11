import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Defaults derived from user's Supabase project 'ecxdhqmalqtgywsclkqu' and bucket 'digital-album'
const DEFAULT_SUPABASE_URL = 'https://ecxdhqmalqtgywsclkqu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeGRocW1hbHF0Z3l3c2Nsa3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MDcwNTAsImV4cCI6MjEwNzI4MzA1MH0.hun6SyqIgydF8J5T1VStwfK1u2XzSuhKIZJ2iq0b1oQ';
const DEFAULT_SUPABASE_BUCKET = 'digital-album';

function normalizeSupabaseUrl(rawUrl: string, anonKey: string): string {
  const trimmed = rawUrl.trim();
  // If user pasted a dashboard URL like https://supabase.com/dashboard/project/<ref>/...
  const projectMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (projectMatch?.[1]) {
    return `https://${projectMatch[1]}.supabase.co`;
  }
  // If user pasted an org dashboard URL or left it blank, extract project ref from the anon JWT if possible
  if (!trimmed || trimmed.includes('supabase.com/dashboard')) {
    try {
      const payloadPart = anonKey.split('.')[1];
      if (payloadPart) {
        const decoded = JSON.parse(atob(payloadPart));
        if (decoded?.ref) {
          return `https://${decoded.ref}.supabase.co`;
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_SUPABASE_URL;
  }
  return trimmed.replace(/\/+$/, '');
}

function normalizeBucketName(rawBucket: string): string {
  const trimmed = rawBucket.trim();
  if (!trimmed) return DEFAULT_SUPABASE_BUCKET;
  // If user pasted the full dashboard URL: https://supabase.com/dashboard/project/.../buckets/digital-album
  const bucketMatch = trimmed.match(/\/buckets\/([^/?#]+)/i);
  if (bucketMatch?.[1]) {
    return bucketMatch[1];
  }
  return trimmed;
}

const rawEnvKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
const rawEnvUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const rawEnvBucket = (import.meta.env.VITE_SUPABASE_BUCKET || DEFAULT_SUPABASE_BUCKET).trim();

export const supabaseAnonKey = rawEnvKey;
export const supabaseUrl = normalizeSupabaseUrl(rawEnvUrl, supabaseAnonKey);
export const supabaseBucket = normalizeBucketName(rawEnvBucket);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(supabase);
}
