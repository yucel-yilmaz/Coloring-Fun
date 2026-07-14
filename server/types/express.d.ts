import type { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      profile?: { id: string; role: 'parent' | 'moderator' | 'admin'; display_name: string };
    }
  }
}

export {};
