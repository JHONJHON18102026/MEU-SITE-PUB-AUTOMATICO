import { writeFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'C:/site/.env' });
const projectId = process.argv[2];
if (!projectId) throw new Error('Informe o projectId.');
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: project, error } = await admin.from('video_projects').select('id,status,thumbnail_url,storage_path').eq('id', projectId).single();
if (error) throw error;
const response = await fetch(project.thumbnail_url);
if (!response.ok) throw new Error(`Thumbnail HTTP ${response.status}`);
const output = 'C:/Users/Jonathan/Desktop/FUTURO-DIGITAL-COMPLETO/test-artifacts/reference-modes/frames-i2v-thumbnail.jpg';
await writeFile(output, Buffer.from(await response.arrayBuffer()));
console.log(JSON.stringify({ id: project.id, status: project.status, storagePath: project.storage_path, thumbnailSaved: output }));
