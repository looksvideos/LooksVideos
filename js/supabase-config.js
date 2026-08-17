import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const SUPABASE_URL='https://uvevnpwplfffmpevmfgj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_oS1PsJ0XNh1jAfwX5Id0WQ_26I6GoWy';
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
export const MAX_VIDEO_BYTES=100*1024*1024;
