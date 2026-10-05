import { supabase } from '@/lib/supabase';

const BUCKET = 'renewal-documents';
const ALLOWED_TYPES = new Set(['application/pdf','image/jpeg','image/png']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadRenewalDocument(companyId: string, requirementKey: string, file: File, userId: string) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('فقط PDF، JPG و PNG قابل قبول است.');
  if (file.size > MAX_FILE_SIZE) throw new Error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${companyId}/renewal-documents/${requirementKey}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, { upsert: true, contentType: file.type, metadata: { companyId, requirementKey, uploadedBy: userId } });
  if (error) throw error;

  const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (signedError || !signed?.signedUrl) throw signedError ?? new Error('ساخت لینک امن سند ناکام شد.');
  return { fileName: file.name, storagePath, downloadUrl: signed.signedUrl, uploadedAt: new Date().toISOString(), uploadedBy: userId };
}
