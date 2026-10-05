import { supabase } from '@/lib/supabase';

type Json = Record<string, unknown>;
type Constraint = { kind: 'where'; field: string; op: string; value: unknown } | { kind: 'orderBy'; field: string; direction: 'asc' | 'desc' };

export interface DocumentReference<T = any> { __kind: 'doc'; path: string; id: string; }
export interface CollectionReference<T = any> { __kind: 'collection'; path: string; }
export interface Query<T = any> { __kind: 'query'; path: string; constraints: Constraint[]; }

export class DocumentSnapshot<T = any> {
  constructor(private readonly value: T | null, public readonly id: string) {}
  exists(): boolean { return this.value !== null; }
  data(): T { return (this.value ?? {}) as T; }
}
export class QueryDocumentSnapshot<T = any> extends DocumentSnapshot<T> {
  override data(): T { return super.data(); }
}
export class QuerySnapshot<T = any> {
  constructor(public readonly docs: QueryDocumentSnapshot<T>[]) {}
  forEach(callback: (snapshot: QueryDocumentSnapshot<T>) => void): void { this.docs.forEach(callback); }
  get size(): number { return this.docs.length; }
}

const pathOf = (parts: unknown[]) => parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join('/');
const currentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('AUTH_REQUIRED');
  return data.user.id;
};

export function doc<T = any>(_db: unknown, ...parts: string[]): DocumentReference<T> {
  if (parts.length < 2) throw new Error('A document path requires a collection path and document id.');
  return { __kind: 'doc', path: pathOf(parts.slice(0, -1)), id: parts[parts.length - 1] };
}
export function collection<T = any>(_db: unknown, ...parts: string[]): CollectionReference<T> {
  return { __kind: 'collection', path: pathOf(parts) };
}
export function query<T = any>(source: CollectionReference<T> | Query<T>, ...constraints: Constraint[]): Query<T> {
  return { __kind: 'query', path: source.path, constraints: [...('constraints' in source ? source.constraints : []), ...constraints] };
}
export function where(field: string, op: string, value: unknown): Constraint {
  return { kind: 'where', field, op, value };
}
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { kind: 'orderBy', field, direction };
}
export function serverTimestamp(): string { return new Date().toISOString(); }

async function readCollection<T = any>(source: CollectionReference<T> | Query<T>): Promise<QuerySnapshot<T>> {
  const uid = await currentUserId();
  let request = supabase.from('app_documents').select('document_id,data,updated_at').eq('owner_user_id', uid).eq('path', source.path);
  const constraints = 'constraints' in source ? source.constraints : [];
  for (const c of constraints) {
    if (c.kind === 'where') {
      if (c.op === '==') request = request.eq(`data->>${c.field}`, String(c.value));
      else if (c.op === '!=') request = request.neq(`data->>${c.field}`, String(c.value));
    }
  }
  const order = constraints.find((c): c is Extract<Constraint,{kind:'orderBy'}> => c.kind === 'orderBy');
  if (order) request = request.order('updated_at', { ascending: order.direction === 'asc' });
  const { data, error } = await request;
  if (error) throw error;
  const docs = (data ?? []).map((row: any) => new QueryDocumentSnapshot<T>((row.data ?? {}) as T, row.document_id));
  return new QuerySnapshot<T>(docs);
}

export async function getDoc<T = any>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  const uid = await currentUserId();
  const { data, error } = await supabase.from('app_documents').select('data').eq('owner_user_id', uid).eq('path', reference.path).eq('document_id', reference.id).maybeSingle();
  if (error) throw error;
  return new DocumentSnapshot<T>(data?.data ? (data.data as T) : null, reference.id);
}

export async function setDoc<T = any>(reference: DocumentReference<T>, value: T, options?: { merge?: boolean }): Promise<void> {
  const uid = await currentUserId();
  let payload: Json = value as Json;
  if (options?.merge) {
    const existing = await getDoc(reference);
    payload = ({ ...((existing.data() ?? {}) as unknown as Json), ...(value as unknown as Json) } as Json);
  }
  const { error } = await supabase.from('app_documents').upsert(
    { owner_user_id: uid, path: reference.path, document_id: reference.id, data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'owner_user_id,path,document_id' },
  );
  if (error) throw error;
}

export async function addDoc<T = any>(source: CollectionReference<T>, value: T): Promise<DocumentReference<T>> {
  const id = crypto.randomUUID();
  const reference = { __kind: 'doc' as const, path: source.path, id } as DocumentReference<T>;
  await setDoc(reference, value);
  return reference;
}

export async function deleteDoc(reference: DocumentReference): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('app_documents').delete().eq('owner_user_id', uid).eq('path', reference.path).eq('document_id', reference.id);
  if (error) throw error;
}

export function onSnapshot<T = any>(source: DocumentReference<T>, next: (snapshot: DocumentSnapshot<T>) => void, error?: (error: Error) => void): () => void;
export function onSnapshot<T = any>(source: CollectionReference<T> | Query<T>, next: (snapshot: QuerySnapshot<T>) => void, error?: (error: Error) => void): () => void;
export function onSnapshot<T = any>(source: DocumentReference<T> | CollectionReference<T> | Query<T>, next: ((snapshot: DocumentSnapshot<T>) => void) | ((snapshot: QuerySnapshot<T>) => void), error?: (error: Error) => void): () => void {
  void (async () => {
    try {
      if (source.__kind === 'doc') next(await getDoc(source) as never);
      else next(await readCollection(source) as never);
    } catch (e) {
      error?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();
  return () => {};
}
