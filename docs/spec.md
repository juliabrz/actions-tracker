# Actions Tracker — Especificação v1

> Status: aprovada · Última revisão: 2026-08-27
> Este documento é a fonte da verdade do escopo. Código que discordar dele está errado — ou o documento precisa ser atualizado antes.

## 1. Problema

Existem coisas que fazemos de tempos em tempos sem nunca ter medido o intervalo: cortar o cabelo, comprar ração, lavar as cortinas, trocar a escova de dentes. O intervalo existe, mas mora na memória — e a memória falha justamente quando o item vence.

O app resolve isso registrando **quando** cada coisa foi feita, **inferindo** a periodicidade a partir do histórico real (em vez de pedir que o usuário a declare) e mostrando o que está próximo de vencer.

A inversão é o ponto: o usuário não configura "a cada 30 dias". Ele só registra o que fez, e o intervalo emerge dos dados.

## 2. Usuários e acesso

Duas pessoas: a dona do app e sua irmã. Algumas ações são individuais, outras são revezadas entre as duas.

- Login exclusivamente via **Google**.
- Acesso controlado por **allowlist fixa de e-mails** em variável de ambiente (`EMAILS_PERMITIDOS`). Qualquer outra conta é recusada no callback de `signIn`.
- Não existe cadastro, convite, recuperação de senha nem tela de administração.

**Por que não uma entidade "casa"/grupo:** foi considerada e descartada. Um grupo com no máximo 2 membros fixos custa tabela, convite, ciclo de vida e seletor de contexto para não entregar nada além do que uma flag de escopo na própria ação já entrega.

## 3. Domínio

### Ação
Uma coisa que se faz repetidamente. Não distingue compra de serviço de tarefa doméstica — tudo é "algo que acontece de tempos em tempos".

| Atributo | Descrição |
|---|---|
| `nome` | Texto livre |
| `dono` | Quem criou |
| `escopo` | `pessoal` (só o dono vê) ou `compartilhada` (ambas veem, registram e editam) |
| `intervaloChuteDias` | Opcional. Palpite do usuário, usado apenas enquanto não há intervalo real |
| `alertaDiasAntes` | Opcional. Override do limiar de alerta |
| `arquivada` | Sai da lista sem perder o histórico |

Uma ação pode ser convertida de `pessoal` para `compartilhada` (e vice-versa) a qualquer momento. O histórico não se move.

### Ocorrência
Um registro de que a ação foi feita em determinado dia.

| Atributo | Descrição |
|---|---|
| `data` | `DATE` puro (`YYYY-MM-DD`), sem hora e sem fuso |
| `feitaPor` | Quem fez — relevante em ações compartilhadas |
| `aproximada` | A data foi lembrada de cabeça, não é exata |
| `valor` | Opcional. Quanto custou |

**Restrição:** `UNIQUE (acao_id, data)` — a mesma ação não pode ser registrada duas vezes no mesmo dia. É rede de segurança contra toque duplo acidental no botão de um toque. Se surgir um caso legítimo de duas vezes no mesmo dia, remover a constraint é uma migration de uma linha.

**Não existe edição de ocorrência.** Errou, apaga e cadastra de novo com a data certa. Edição inline duplicaria caminho de código para o mesmo resultado.

## 4. Cálculo da periodicidade

O núcleo do produto. Implementado como módulo puro e coberto por testes — um erro aqui é invisível por meses.

### 4.1 Intervalos

Ordenar as ocorrências da ação por data crescente e tirar a diferença em dias de calendário entre consecutivas. `N` ocorrências geram `N - 1` intervalos.

### 4.2 Intervalo estimado

```
janela = últimos 5 intervalos

se houver ≥ 1 intervalo:
    intervalo = mediana(janela)        origem: "histórico"
senão se houver chute:
    intervalo = intervaloChuteDias     origem: "chute"
senão:
    intervalo = null                   sem previsão
```

**Mediana, não média.** Você viaja e fica 4 meses sem cortar o cabelo: a média vira lixo, a mediana ignora o outlier sozinha, sem nenhuma lógica de descarte. Mediana de quantidade par de valores = média dos dois centrais, arredondada.

**Janela de 5.** Dá o efeito de recência de graça: se o seu ritmo mudou, os intervalos antigos saem da conta sem precisar de ponderação.

**O chute é descartável.** Assim que existe um único intervalo real, o chute é ignorado para sempre. Ele nunca entra na mediana como se fosse observação — uma opinião não pode contaminar permanentemente a estatística.

### 4.3 Confiança

A estimativa sempre é exibida, mas acompanhada do quanto se pode confiar nela.

| Nível | Condição |
|---|---|
| `sem_dados` | Nenhum intervalo e nenhum chute |
| `chute` | Nenhum intervalo, só o palpite do usuário |
| `fraca` | 1 intervalo — amostra de tamanho 1, pode ser acaso |
| `razoavel` | 2 intervalos |
| `boa` | 3 ou mais intervalos |

**Rebaixamento:** se qualquer ocorrência que participa da janela for `aproximada`, a confiança cai um nível — com piso em `fraca` enquanto existir ao menos um intervalo real.

**Por que exibir sempre em vez de ficar mudo:** ficar em silêncio até haver dados suficientes significaria não fazer nada por dois ciclos inteiros. Para corte de cabelo são ~4 meses; para lavagem de sofá, mais de um ano. Exatamente a fase em que o usuário mais precisa de retorno para não abandonar o hábito de registrar. A solução é ser **incerto**, não **mudo**.

### 4.4 Próxima data e alerta

```
proximaData = ultimaOcorrencia + intervalo
limiar      = alertaDiasAntes ?? max(1, arredondar(intervalo × 0,15))
diasRestantes = proximaData − hoje          (negativo = atrasada)
```

**Limiar percentual, não fixo.** Um item de 30 dias e um de 365 não podem usar a mesma antecedência: 7 dias antes de algo anual é inútil, 7 dias antes de algo quinzenal é metade do ciclo. 15% escala sozinho — 4 dias no ciclo de 30, 55 dias no ciclo de 365.

### 4.5 Estados

| Estado | Condição |
|---|---|
| `sem_previsao` | Sem intervalo estimado ou sem nenhuma ocorrência |
| `em_dia` | `diasRestantes > limiar` |
| `aproximando` | `0 ≤ diasRestantes ≤ limiar` |
| `atrasada` | `diasRestantes < 0` |

**Destaque visual e ordenação por urgência** só se aplicam a ações com **2 ou mais intervalos reais**. Com 1 intervalo a previsão aparece em cinza, sem cor de alerta e sem subir no topo.

> Nota: esta regra nasceu como "notificar a partir de 2 intervalos, exibir a partir de 1". Como o v1 não tem notificação, "notificar" foi traduzido para "destacar e ordenar por urgência".

## 5. Telas

### `/login`
Um botão: entrar com Google. Mensagem de recusa se a conta não estiver na allowlist.

### `/` — Lista
A tela principal. Como não há notificação no v1, **esta tela é o produto inteiro**.

- Lista única, ordenada por urgência: atrasadas → se aproximando → em dia.
- Filtro no topo: minhas / compartilhadas / todas.
- Cada linha mostra nome, estado, próxima data, confiança e — em ações compartilhadas — quem fez por último.
- **Botão "fiz" em cada linha**, um toque só. Esse é o caminho quente: o registro acontece no momento do ato, geralmente no celular. Mais de dois toques de atrito e o usuário para de registrar em três semanas — e sem dados não há periodicidade nenhuma para calcular.
- **Desfazer obrigatório:** snackbar por ~10 segundos após o registro. Botão de um toque garante registro acidental, e uma ocorrência falsa envenena a mediana.
- Ações "em dia" **não** ficam escondidas atrás de um toque: ver que está tudo em dia é parte do motivo de abrir o app.

### `/acoes/nova`
Nome, escopo, e dois campos opcionais: "quando foi a última vez?" (cria a primeira ocorrência) e "de quanto em quanto tempo você acha que faz?" (o chute). Detalhes avançados — override do alerta, valor — atrás de um "mais opções".

### `/acoes/[id]` — Detalhe
Histórico de ocorrências, cadastro retroativo (data exata + checkbox "data aproximada"), apagar ocorrência, editar a ação, arquivar.

## 6. Modelo de dados

```
user, account, session, verificationToken     -- exigidos pelo @auth/drizzle-adapter

acoes
  id                   uuid pk
  dono_id              text → user.id (cascade)
  nome                 text
  escopo               enum('pessoal','compartilhada')
  intervalo_chute_dias int?
  alerta_dias_antes    int?
  arquivada            bool = false
  criada_em            timestamptz

ocorrencias
  id            uuid pk
  acao_id       uuid → acoes.id (cascade)
  data          DATE                     -- sem hora, sem fuso
  feita_por_id  text → user.id
  aproximada    bool = false
  valor         numeric(10,2)?
  criada_em     timestamptz
  UNIQUE (acao_id, data)
```

**Nada derivado é armazenado.** Intervalo, confiança, próxima data e estado são calculados na leitura, a partir das ocorrências. Sem cache, sem invalidação, sem risco de valor derivado divergir da origem. O volume de dados de duas pessoas nunca vai justificar o contrário.

**Datas com fuso resolvido na origem.** `ocorrencias.data` é `DATE` puro. Se fosse `timestamp` UTC, "cortei o cabelo hoje às 22h" em São Paulo viraria o dia seguinte no banco e todos os intervalos ficariam sutilmente tortos. O "hoje" do servidor é resolvido em `America/Sao_Paulo` via `Intl.DateTimeFormat`, independente do fuso onde a aplicação roda. `criada_em` é timestamp UTC e não entra em cálculo nenhum.

## 7. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | é o que a autora quer aprender; Server Actions dispensam camada de API |
| Banco | Postgres no Neon (free tier) | datas e agregações são trabalho de SQL |
| ORM | Drizzle | próximo do SQL — ensina em vez de esconder |
| Auth | Auth.js v5 + Google | provider único, allowlist no callback |
| UI | Tailwind 4 + shadcn/ui (Radix) | componentes copiados para o repo, não dependência mágica |
| Datas | date-fns | com fuso fixo em `America/Sao_Paulo` |
| Deploy | Vercel | zero config com Next.js |

**Supabase foi considerado e descartado.** Juntaria banco, auth e storage num serviço só, e seria a escolha certa se o objetivo fosse velocidade. Não é: o objetivo é aprender como as peças se encaixam, e o cliente Supabase puxa o código para fora dos padrões do Next.js.

Proteção de rota é feita no layout do grupo `src/app/(app)/`, com `auth()` no servidor — não em middleware. Sessão é de banco (via adapter), e adapter não roda no edge; middleware exigiria configuração dividida para resolver um problema que este app não tem.

## 8. Fora do escopo do v1

Cada item aqui foi discutido e adiado de propósito.

| Item | Por que ficou fora |
|---|---|
| **Notificação** (e-mail, push, Telegram) | Decisão consciente: primeiro usar no dia a dia, depois decidir o canal. **Ver risco na seção 9.** |
| **PWA** | Retirado do v1. Manifest + ícones + service worker entram depois sem reescrever nada — o que é caro de retrofitar é push, não o PWA em si |
| Rodízio automático de vez | "Revezamos" foi resolvido com `feita_por` na ocorrência. Saber quem fez por último já elimina 90% do atrito; alternância automática traz casos chatos (mesma pessoa duas vezes seguidas, compartilhada sem ordem) |
| Estoque e quantidade | Dobraria a complexidade do domínio para ganhar precisão num subconjunto dos casos. Data + intervalo resolve o resto |
| Categorias / tags | Duas pessoas, dezenas de itens. Filtro por escopo basta |
| Snooze | Um item vermelho na lista já é o lembrete |
| Edição de ocorrência | Apagar + recadastrar retroativo dá o mesmo resultado |
| Relatório de gastos | O **campo** `valor` está no v1; a **tela** não. Uma coluna agora evita migração de dados históricos depois — registros antigos nunca teriam preço |
| Mais de uma casa/grupo por pessoa | Ver seção 2 |
| Fotos, gráficos, exportação | Sem demanda real |

## 9. Riscos conhecidos

**Um aviso que só existe dentro do site não é um aviso — é um relatório.** Ele só funciona se o usuário já abriu. Combinado com o padrão de uso previsto (abrir o app *quando faz*, não *quando está na hora de fazer*), o risco concreto é registrar tudo direitinho por meses e nunca ser avisada de nada.

Isso é uma decisão consciente da autora: usar primeiro, medir o incômodo, e então escolher o canal de notificação com informação real em vez de palpite. **É a primeira feature depois do v1.**

## 10. Pendências em aberto

Nenhuma. As duas anteriores foram resolvidas:

- ~~Bug de fuso em `somarDias`~~ — corrigido. A suíte de datas roda idêntica em `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati` e `America/Sao_Paulo`, com teste de regressão nomeado.
- ~~Ação com chute mas sem âncora~~ — resolvido como proposto: o formulário de nova ação pergunta "quando foi a última vez?", e a resposta vira a primeira ocorrência, marcada como aproximada. Sem ela, a ação existe mas não projeta data — comportamento coberto por teste.

## 11. Plano de implementação

| # | Etapa | Status |
|---|---|---|
| 1 | Scaffold: Next + Tailwind + shadcn, Drizzle + Neon, Auth.js Google com allowlist | ✅ |
| 2 | Schema + migration | 🔶 SQL gerado (`drizzle/0000_inicial.sql`), não aplicado — falta banco |
| 3 | Motor de cálculo (`lib/periodicidade.ts`) + testes | ✅ 42 testes |
| 4 | Lista + registrar + desfazer | ✅ código pronto, sem execução real |
| 5 | Detalhe: histórico, retroativo, apagar, arquivar | ✅ código pronto, sem execução real |
| 6 | Deploy na Vercel + Neon de produção | ⬜ |

**Bloqueio atual:** faltam credenciais no `.env.local` — connection string do Neon, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` do Google Cloud Console (redirect URI `http://localhost:3000/api/auth/callback/google`) e os dois e-mails em `EMAILS_PERMITIDOS`.

Enquanto isso, `build`, `lint`, `tsc` e os testes passam — mas **nenhuma tela foi executada contra um banco real**. Toda a camada de dados e de UI está verificada apenas por tipagem e compilação. Os primeiros erros de integração aparecem no `npm run dev` com credenciais válidas, e é esperado que apareçam.
