-- Rede de lojas — rodada 19 (complemento): as funções de validação dos gatilhos de talentos não precisam ser
-- chamáveis de fora. Os gatilhos continuam funcionando (o privilégio de execução só é conferido ao criar o gatilho).
-- Mesmo padrão da função de validação do cadastro de colaboradores (rodada 18). Idempotente.
revoke all on function public.rede_rh_nb_validar() from public, anon, authenticated;
revoke all on function public.rede_rh_lid_validar() from public, anon, authenticated;
