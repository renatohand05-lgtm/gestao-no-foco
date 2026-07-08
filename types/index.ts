import type { TenantRole } from "@/lib/constants";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  created_at: string;
  updated_at: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  segment: TenantSegment | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantSegment =
  | "oficina"
  | "restaurante"
  | "comercio"
  | "consultoria"
  | "servicos"
  | "outro";

export type TenantMember = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
};

export type TenantWithRole = Tenant & {
  role: TenantRole;
};
