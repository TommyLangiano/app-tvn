import { z } from 'zod';

/**
 * Zod validation schemas per tutte le API
 * Centralizza la validazione input per sicurezza e consistency
 */

// ========== AUTH SCHEMAS ==========

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
});

export const signupSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password deve essere almeno 8 caratteri'),
  full_name: z.string().min(1, 'Nome completo obbligatorio'),
});

// ========== USER SCHEMAS ==========

export const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  first_name: z.string().min(1, 'Nome obbligatorio'),
  last_name: z.string().min(1, 'Cognome obbligatorio'),
  role: z.enum(['admin', 'admin_readonly', 'operaio', 'billing_manager']).optional(),
  custom_role_id: z.string().uuid().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
  send_invite: z.boolean().default(true),
  birth_date: z.string().optional(),
  hire_date: z.string().optional(),
  medical_checkup_date: z.string().optional(),
  medical_checkup_expiry: z.string().optional(),
}).refine(
  (data) => data.role || data.custom_role_id,
  { message: 'Deve essere specificato role o custom_role_id' }
);

export const updateUserSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
  role: z.enum(['admin', 'admin_readonly', 'operaio', 'billing_manager']).optional(),
  email: z.string().email().optional(),
  birth_date: z.string().optional(),
  hire_date: z.string().optional(),
  medical_checkup_date: z.string().optional(),
  medical_checkup_expiry: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

// ========== STORAGE SCHEMAS ==========

export const storageDownloadSchema = z.object({
  path: z.string()
    .min(1, 'Path obbligatorio')
    .refine(
      (path) => !path.includes('..') && !path.startsWith('/') && !path.includes('\\'),
      { message: 'Path non valido' }
    )
    .refine(
      (path) => path.split('/').length >= 2,
      { message: 'Path deve essere formato tenant_id/folder/file' }
    ),
});

// ========== HELPER FUNCTIONS ==========

/**
 * Valida il body della request con uno schema Zod
 */
export async function validateRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0].message,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON body',
    };
  }
}

/**
 * Valida i query params con uno schema Zod
 */
export function validateQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
