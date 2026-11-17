# Catálogo de carros (oficina)

`carros.json` guarda **marca → modelo → versão → anos** de carros de passeio e
utilitários leves vendidos no Brasil (107 marcas, ~1.046 modelos, ~7.390
versões). Ele é carregado só quando alguém abre o cadastro de veículo de uma
**oficina** (`ui.automotiveWorkflow`), e funciona sem nenhum serviço externo.

- Só nomes e anos. **Não há preços** nem dados de proprietário.
- Os campos continuam livres: se o carro não estiver na lista, digita-se normalmente.
- Não inclui motos nem caminhões.

## Origem dos dados

Tabela FIPE (referência 2026-11), obtida do repositório público
`joaomoraes83-dev/json-fipe` (`db.json`). Esse repositório se declara de uso
educacional/pessoal; como guardamos apenas os nomes públicos de marca, modelo e
versão (sem valores), o risco é baixo, mas vale confirmar antes de divulgar o
catálogo como produto à parte.

## Como atualizar

```bash
node scripts/gerar-catalogo-veiculos.mjs <caminho/db.json> 2026-11
npm run test:veiculo-catalogo
```

O gerador padroniza os nomes (ex.: "GM - Chevrolet" → "Chevrolet"), separa
modelo de versão e junta os anos de cada versão (`"2008-2013,2015"`).
