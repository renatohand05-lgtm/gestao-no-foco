"use server";

import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2MB — mesmo limite do bucket

export async function uploadTenantLogoAction(
  tenantSlug: string,
  base64Data: string,
  mimeType: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      return {
        success: false,
        error: "Só o proprietário ou administrador pode alterar a logo.",
      };
    }

    const ext = ALLOWED_MIME[mimeType];
    if (!ext) {
      return {
        success: false,
        error: "Formato de imagem não suportado. Use PNG, JPG, WEBP ou SVG.",
      };
    }

    const bytes = Buffer.from(base64Data, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      return { success: false, error: "Imagem maior que 2MB." };
    }

    const supabase = await createClient();
    const path = `${tenant.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("tenant-logos")
      .upload(path, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from("tenant-logos")
      .getPublicUrl(path);

    // Cache-bust: cliente mantém a mesma URL base, então adiciona um carimbo
    // de versão pra imagens antigas não ficarem presas em cache do navegador.
    const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("tenants")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", tenant.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/configuracoes`);

    return { success: true, id: tenant.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao enviar a logo. Tente novamente.",
    };
  }
}

export async function removeTenantLogoAction(
  tenantSlug: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      return {
        success: false,
        error: "Só o proprietário ou administrador pode alterar a logo.",
      };
    }

    const supabase = await createClient();

    // Remove qualquer extensão que exista pra esse tenant.
    const { data: files } = await supabase.storage
      .from("tenant-logos")
      .list(tenant.id);
    if (files && files.length > 0) {
      await supabase.storage
        .from("tenant-logos")
        .remove(files.map((f) => `${tenant.id}/${f.name}`));
    }

    const { error: updateError } = await supabase
      .from("tenants")
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq("id", tenant.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/configuracoes`);

    return { success: true, id: tenant.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao remover a logo. Tente novamente.",
    };
  }
}
