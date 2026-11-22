import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'C:/site/.env' });
const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = 'c9305621-2fa8-4115-8568-4d6608584baa';
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: project, error: projectError } = await admin.from('video_projects').select('user_id,completed_at').eq('id', projectId).single();
if (projectError) throw projectError;
const { data: userData, error: userError } = await admin.auth.admin.getUserById(project.user_id);
if (userError || !userData.user?.email) throw userError ?? new Error('Usuário sem email.');
const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: userData.user.email });
if (linkError || !linkData.properties?.hashed_token) throw linkError ?? new Error('Link sem token.');
const browserClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { error: authError } = await browserClient.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: 'magiclink' });
if (authError) throw authError;

let received = false;
const originalCompletedAt = project.completed_at;
const channel = browserClient
  .channel(`verify-projects-${Date.now()}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'video_projects', filter: `user_id=eq.${project.user_id}` }, (payload) => {
    if (payload.new?.id === projectId) received = true;
  });

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Canal Realtime não conectou.')), 10_000);
  channel.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') return;
    clearTimeout(timer);
    await new Promise((ready) => setTimeout(ready, 750));
    const { error } = await admin.from('video_projects').update({ completed_at: new Date().toISOString() }).eq('id', projectId);
    if (error) reject(error);
    else resolve();
  });
});

await new Promise((resolve) => setTimeout(resolve, 5_000));
await admin.from('video_projects').update({ completed_at: originalCompletedAt }).eq('id', projectId);
await browserClient.removeChannel(channel);
console.log(JSON.stringify({ subscribed: true, received }));
if (!received) process.exitCode = 2;
