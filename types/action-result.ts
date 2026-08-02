/** Resultado padronizado de Server Actions (Sprint 9.8 · extensão 29.0). */

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

/**
 * ActionResult com payload tipado no sucesso (aditivo — não quebra ActionResult).
 * Use quando a action precisa devolver dados além de `id`.
 */
export type ActionResultWith<T> =
  | ({ success: true; id?: string } & T)
  | { success: false; error: string };

export function actionOk(id?: string): Extract<ActionResult, { success: true }> {
  return id === undefined ? { success: true } : { success: true, id };
}

export function actionFail(error: string): Extract<ActionResult, { success: false }> {
  return { success: false, error };
}

export function actionOkWith<T extends Record<string, unknown>>(
  data: T,
  id?: string,
): ActionResultWith<T> {
  return id === undefined
    ? ({ success: true, ...data } as ActionResultWith<T>)
    : ({ success: true, id, ...data } as ActionResultWith<T>);
}
