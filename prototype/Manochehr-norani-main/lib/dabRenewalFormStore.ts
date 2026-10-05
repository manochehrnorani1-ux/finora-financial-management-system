/**
 * DAB form persistence backed by the Supabase Form Engine.
 *
 * Renewal data is stored as a form submission plus normalized field values.
 * No legacy Firestore/Firebase compatibility layer is used here.
 */

import { supabase } from '@/lib/supabase';

export type DabRenewalFormData = Record<string, unknown>;

type FormVersionRow = {
  id: string;
  version_no: number;
  form_definition_id: string;
};

type FormFieldRow = {
  id: string;
  field_key: string;
};

type SubmissionRow = {
  id: string;
  status: string;
  updated_at: string;
};

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('AUTH_REQUIRED');
  return data.user;
}

async function resolvePublishedVersion(formId: string): Promise<FormVersionRow> {
  const { data: definition, error: definitionError } = await supabase
    .from('form_definitions')
    .select('id')
    .eq('form_key', formId)
    .eq('active', true)
    .maybeSingle();

  if (definitionError) throw definitionError;
  if (!definition) throw new Error(`FORM_NOT_REGISTERED:${formId}`);

  const { data: version, error: versionError } = await supabase
    .from('form_versions')
    .select('id,version_no,form_definition_id')
    .eq('form_definition_id', definition.id)
    .eq('status', 'published')
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!version) throw new Error(`FORM_VERSION_NOT_PUBLISHED:${formId}`);

  return version as FormVersionRow;
}

async function resolveFields(versionId: string): Promise<FormFieldRow[]> {
  const { data, error } = await supabase
    .from('form_fields')
    .select('id,field_key,form_sections!inner(form_version_id)')
    .eq('form_sections.form_version_id', versionId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    field_key: row.field_key as string,
  }));
}

async function findSubmission(
  companyId: string,
  formDefinitionId: string,
  versionId: string,
) {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('id,status,updated_at')
    .eq('company_id', companyId)
    .eq('form_definition_id', formDefinitionId)
    .eq('form_version_id', versionId)
    .eq('case_id', companyId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SubmissionRow | null;
}

async function saveValues(submissionId: string, fields: FormFieldRow[], values: DabRenewalFormData) {
  const rows = fields
    .filter((field) => Object.prototype.hasOwnProperty.call(values, field.field_key))
    .map((field) => {
      const value = values[field.field_key];

      if (typeof value === 'number') {
        return {
          submission_id: submissionId,
          field_id: field.id,
          value_number: value,
          value_text: null,
          value_boolean: null,
          value_date: null,
          value_json: null,
          file_path: null,
        };
      }

      if (typeof value === 'boolean') {
        return {
          submission_id: submissionId,
          field_id: field.id,
          value_number: null,
          value_text: null,
          value_boolean: value,
          value_date: null,
          value_json: null,
          file_path: null,
        };
      }

      if (typeof value === 'string') {
        return {
          submission_id: submissionId,
          field_id: field.id,
          value_number: null,
          value_text: value,
          value_boolean: null,
          value_date: null,
          value_json: null,
          file_path: null,
        };
      }

      return {
        submission_id: submissionId,
        field_id: field.id,
        value_number: null,
        value_text: null,
        value_boolean: null,
        value_date: null,
        value_json: value ?? null,
        file_path: null,
      };
    });

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('form_submission_values')
    .upsert(rows, { onConflict: 'submission_id,field_id' });

  if (error) throw error;
}

export function dabRenewalFormRef(companyId: string, formId: string) {
  return { companyId, formId };
}

export async function saveDabRenewalForm(
  companyId: string,
  formId: string,
  data: DabRenewalFormData,
) {
  const user = await requireUser();
  const version = await resolvePublishedVersion(formId);
  const fields = await resolveFields(version.id);
  const existing = await findSubmission(companyId, version.form_definition_id, version.id);

  let submissionId = existing?.id;

  if (submissionId) {
    const { error } = await supabase
      .from('form_submissions')
      .update({
        status: 'draft',
        submitted_by: user.id,
        metadata: { formId },
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) throw error;
  } else {
    const { data: created, error } = await supabase
      .from('form_submissions')
      .insert({
        form_definition_id: version.form_definition_id,
        form_version_id: version.id,
        owner_user_id: user.id,
        company_id: companyId,
        case_id: companyId,
        status: 'draft',
        submitted_by: user.id,
        metadata: { formId },
      })
      .select('id')
      .single();

    if (error) throw error;
    submissionId = created.id as string;
  }

  await saveValues(submissionId, fields, data);
}

export async function loadDabRenewalForm(companyId: string, formId: string) {
  await requireUser();
  const version = await resolvePublishedVersion(formId);
  const submission = await findSubmission(companyId, version.form_definition_id, version.id);

  if (!submission) return null;

  const { data, error } = await supabase
    .from('form_submission_values')
    .select('field_id,value_text,value_number,value_boolean,value_date,value_json,file_path')
    .eq('submission_id', submission.id);

  if (error) throw error;

  const fieldIds = (data ?? []).map((row) => row.field_id);
  if (fieldIds.length === 0) {
    return {
      formId,
      values: {},
      status: submission.status,
      updatedAt: submission.updated_at,
    };
  }

  const { data: fields, error: fieldsError } = await supabase
    .from('form_fields')
    .select('id,field_key')
    .in('id', fieldIds);

  if (fieldsError) throw fieldsError;

  const keyById = new Map((fields ?? []).map((field) => [field.id, field.field_key]));
  const values: DabRenewalFormData = {};

  for (const row of data ?? []) {
    const key = keyById.get(row.field_id);
    if (!key) continue;

    values[key] =
      row.value_text ??
      row.value_number ??
      row.value_boolean ??
      row.value_date ??
      row.value_json ??
      row.file_path ??
      null;
  }

  return {
    formId,
    values,
    status: submission.status,
    updatedAt: submission.updated_at,
  };
}
