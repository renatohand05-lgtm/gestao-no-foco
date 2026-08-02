# next start — Sprint 29.9

- **Início:** 2026-08-02 (local)
- **Porta:** 3001
- **Bind:** localhost
- **Build:** EXIT 0 (ver build.log)
- **Ready:** ~198 ms (Next.js 16.2.10)
- **Nota:** auth Playwright exige host `localhost` (não `127.0.0.1`)
- **Dev paralelo:** npm run dev em :3000 não interferiu
- **Erros de boot:** nenhum (apenas warning npm `devdir`)
- **Rotas smoke:** /, /login, /dashboard, /crm, /financeiro, /analytics, /financeiro/dre
- **Encerramento:** processo dedicado; não derrubar o `npm run dev` do usuário
