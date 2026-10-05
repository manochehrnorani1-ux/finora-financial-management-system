import { supabase } from '@/lib/supabase';
import type { DABRenewalAuditEvent, DABRenewalCase } from './dabRenewalDomain';

export function renewalCaseRef(companyId: string, applicationId: string) {
  return { companyId, applicationId };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('AUTH_REQUIRED');
  return data.user;
}

export async function saveRenewalCase(caseFile: DABRenewalCase) {
  const user = await requireUser();

  const { error } = await supabase
    .from('case_files')
    .upsert({
      owner_user_id: user.id,
      company_id: caseFile.companyId,
      case_type: 'dab_renewal',
      case_number: caseFile.applicationId,
      title: `DAB renewal ${caseFile.licenseNo}`,
      description: caseFile.notes ?? null,
      status: caseFile.status,
      metadata: caseFile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,case_number' });

  if (error) throw error;
}

export async function getRenewalCase(companyId: string, applicationId: string) {
  const { data, error } = await supabase
    .from('case_files')
    .select('metadata')
    .eq('company_id', companyId)
    .eq('case_number', applicationId)
    .eq('case_type', 'dab_renewal')
    .maybeSingle();

  if (error) throw error;
  return (data?.metadata as DABRenewalCase | null) ?? null;
}

export async function appendRenewalAudit(
  event: Omit<DABRenewalAuditEvent, 'id' | 'actorId' | 'createdAt'>,
) {
  const user = await requireUser();

  const { error } = await supabase.from('audit_logs').insert({
    owner_user_id: user.id,
    company_id: event.companyId,
    case_id: event.applicationId,
    entity_type: 'dab_renewal',
    entity_id: event.applicationId,
    action: event.action,
    actor_id: user.id,
    actor_role: event.actorRole ?? null,
    reason: event.reason ?? null,
    before_data: event.fromStatus ? { status: event.fromStatus } : null,
    after_data: event.toStatus ? { status: event.toStatus } : null,
  });

  if (error) throw error;
}
