/**
 * @gof/schemas — Zod DTOs multiplataforma (stub 31.0).
 */
import { z } from "zod";

export const loginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z.object({
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  confirmPassword: z.string().min(1),
}).refine((v) => v.password === v.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

export const biometricPrefsSchema = z.object({
  enabled: z.boolean(),
});

export type BiometricPrefs = z.infer<typeof biometricPrefsSchema>;

export const publicEnvSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_APP_ENV: z
    .enum(["development", "preview", "production"])
    .default("development"),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
