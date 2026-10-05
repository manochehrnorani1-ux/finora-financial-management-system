import { supabase } from '@/lib/supabase';

export const db = supabase;

type CompatUser = {
  uid: string;
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
};

let cachedUser: CompatUser | null = null;
let listenerStarted = false;

function startListener() {
  if (listenerStarted || typeof window === 'undefined') return;
  listenerStarted = true;
  void supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user;
    cachedUser = user
      ? { uid: user.id, getIdTokenResult: async () => ({ claims: { ...(user.app_metadata ?? {}) } }) }
      : null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    cachedUser = user
      ? { uid: user.id, getIdTokenResult: async () => ({ claims: { ...(user.app_metadata ?? {}) } }) }
      : null;
  });
}

export const auth = {
  get currentUser(): CompatUser | null {
    startListener();
    return cachedUser;
  },
};
