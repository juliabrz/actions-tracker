# Activity Tracker — Especificação v1

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
| `name` | Texto livre |
| `owner` | Quem criou |
| `scope` | `personal` (só o dono vê) ou `shared` (ambas veem, registram e editam) |
| `guessedIntervalDays` | Opcional. Palpite do usuário, usado apenas enquanto não há intervalo real |
| `alertDaysBefore` | Opcional. Override do limiar de alerta |
| `archived` | Sai da lista sem perder o histórico |

Uma ação pode ser convertida de `personal` para `shared` (e vice-versa) a qualquer momento. O histórico não se move.

### Ocorrência
Um registro de que a ação foi feita em determinado dia.

| Atributo | Descrição |
|---|---|
| `date` | `DATE` puro (`YYYY-MM-DD`), sem hora e sem fuso |
| `doneBy` | Quem fez — relevante em ações compartilhadas |
| `approximate` | A data foi lembrada de cabeça, não é exata |
| `cost` | Opcional. Quanto custou |

**Restrição:** `UNIQUE (activity_id, date)` — a mesma ação não pode ser registrada duas vezes no mesmo dia. É rede de segurança contra toque duplo acidental no botão de um toque. Se surgir um caso legítimo de duas vezes no mesmo dia, remover a constraint é uma migration de uma linha.

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

**A ordenação por urgência** só se aplica a ações com **2 ou mais intervalos reais**: com um único ciclo medido a ação não disputa o topo da lista.

Mas ela continua **colorida no tom do próprio estado, em intensidade menor** — não cinza. Pintar de neutro algo que vence hoje é sinal falso: o texto anuncia urgência e a cor desmente. A regra sempre foi *não gritar*, nunca *ficar mudo*.

> Nota: esta regra nasceu como "notificar a partir de 2 intervalos, exibir a partir de 1". Como o v1 não tem notificação, "notificar" foi traduzido para "destacar e ordenar por urgência".

## 5. Telas

### `/login`
Um botão: entrar com Google. Mensagem de recusa se a conta não estiver na allowlist.

### `/` — Lista
A tela principal. Como não há notificação no v1, **esta tela é o produto inteiro**.

- Lista única, ordenada por urgência: atrasadas → se aproximando → em dia.
- Filtro no topo: minhas / compartilhadas / todas.
- Cada linha mostra nome, estado, próxima data, confiança e — em ações compartilhadas — quem fez por último.
- **Botão "fiz" em cada linha**, um toque só — um círculo com check. Esse é o caminho quente: o registro acontece no momento do ato, geralmente no celular. Mais de dois toques de atrito e o usuário para de registrar em três semanas — e sem dados não há periodicidade nenhuma para calcular.
- **Os campos opcionais vêm depois do toque, não antes.** O toque grava na hora; o aviso que aparece traz "Desfazer" e "Detalhes", e é por Detalhes que se anexa o valor gasto ou a marcação de data aproximada. Pedir isso antes colocaria atrito exatamente onde o desenho inteiro existe para não ter.
- **Desfazer obrigatório:** snackbar por ~10 segundos após o registro. Botão de um toque garante registro acidental, e uma ocorrência falsa envenena a mediana.
- Ações "em dia" **não** ficam escondidas atrás de um toque: ver que está tudo em dia é parte do motivo de abrir o app.

### `/activities/new`
Nome, escopo e "quando foi a última vez?" — que cria a primeira ocorrência e, com ela, a âncora sem a qual não há o que projetar. Ao preencher a data aparece a marcação **"data aproximada"**, ligada por padrão: quem responde essa pergunta quase sempre lembra de cabeça, e prometer menos precisão do que se tem é seguro, enquanto o contrário envenena a confiança da estimativa.

Atrás de "mais opções": o palpite de ciclo e o override do aviso. Ao digitar o palpite, o campo de aviso mostra ao vivo quantos dias aquele ciclo produziria, com um link para fixar. **Sugere em vez de preencher**: um número escrito no campo vira override e congela, enquanto o automático acompanha a mediana conforme os ciclos reais substituem o palpite.

### `/activities/[id]` — Detalhe
Histórico de ocorrências, cadastro retroativo (data exata + checkbox "data aproximada"), apagar ocorrência, editar a ação, arquivar e excluir.

**Arquivar e excluir não são a mesma coisa**, e a interface precisa deixar isso claro. Arquivar é para "parei de fazer isso": some da lista, guarda o histórico. Excluir é para "isso não devia existir": apaga a ação e todas as ocorrências junto, por cascade, sem desfazer. A confirmação de exclusão diz quantos registros serão perdidos e sugere arquivar no lugar.

## 6. Modelo de dados

```
user, account, session, verificationToken     -- exigidos pelo @auth/drizzle-adapter

activities
  id                     uuid pk
  owner_id               text → user.id (cascade)
  name                   text
  scope                  enum('personal','shared')
  guessed_interval_days  int?
  alert_days_before      int?
  archived               bool = false
  created_at             timestamptz

occurrences
  id           uuid pk
  activity_id  uuid → activities.id (cascade)
  date         DATE                     -- sem hora, sem fuso
  done_by_id   text → user.id
  approximate  bool = false
  cost         numeric(10,2)?
  created_at   timestamptz
  UNIQUE (activity_id, date)
```

**Nada derivado é armazenado.** Intervalo, confiança, próxima data e estado são calculados na leitura, a partir das ocorrências. Sem cache, sem invalidação, sem risco de valor derivado divergir da origem. O volume de dados de duas pessoas nunca vai justificar o contrário.

**Datas com fuso resolvido na origem.** `occurrences.date` é `DATE` puro. Se fosse `timestamp` UTC, "cortei o cabelo hoje às 22h" em São Paulo viraria o dia seguinte no banco e todos os intervalos ficariam sutilmente tortos. O "hoje" do servidor é resolvido em `America/Sao_Paulo` via `Intl.DateTimeFormat`, independente do fuso onde a aplicação roda. `created_at` é timestamp UTC e não entra em cálculo nenhum.

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

### Idioma

**Código em inglês, produto em português.** Identificadores, comentários, nomes de tabela e coluna, rotas e descrições de teste são em inglês. Textos de tela e esta documentação são em português — quem usa o app são duas brasileiras.

Uma nota de nomenclatura: o domínio chama de "ação" o que no código é **`Activity`**, não `Action`. A tradução direta colidiria com as Server Actions do Next.js, e `activities/actions.ts` se lê sozinho onde `actions/actions.ts` não se leria. O registro de uma ação feita é uma **`Occurrence`**.

**Supabase foi considerado e descartado.** Juntaria banco, auth e storage num serviço só, e seria a escolha certa se o objetivo fosse velocidade. Não é: o objetivo é aprender como as peças se encaixam, e o cliente Supabase puxa o código para fora dos padrões do Next.js.

Proteção de rota é feita no layout do grupo `src/app/(app)/`, com `auth()` no servidor — não em middleware. Sessão é de banco (via adapter), e adapter não roda no edge; middleware exigiria configuração dividida para resolver um problema que este app não tem.

## 7.1 Rodando localmente

O banco de desenvolvimento é **PGlite** — Postgres compilado em WASM, rodando dentro do próprio processo Node. Não há daemon, container nem cadastro; o banco inteiro é a pasta `.pglite/`, ignorada pelo git.

Isso não é preciosismo: o driver `neon()` fala o protocolo HTTP da Neon, não o protocolo de fio do Postgres. Qualquer banco local — Docker inclusive — exigiria um segundo driver de qualquer jeito. `src/db/index.ts` escolhe o driver pelo prefixo do `DATABASE_URL`, e `pglite://` é recusado quando `NODE_ENV=production`.

```bash
npm run db:seed   # cria o banco, aplica as migrations e popula
npm run dev
```

Depois abra **`/dev-login`** e escolha entre Julia e Marina. Essa rota escreve a sessão e o cookie direto, o que é o único jeito de entrar sem Google enquanto a sessão é de banco — um provider de credenciais exigiria trocar a estratégia para JWT. Ela é duplamente travada: fora de produção **e** com `DEV_LOGIN=true`.

O seed cria 12 ações desenhadas para exercitar cada estado da interface — atrasada, chegando, em dia, sem previsão, palpite sem ciclo medido, previsão em cinza por ter só um ciclo, confiança rebaixada por data aproximada, outlier que a mediana precisa ignorar, override manual do aviso, valores em reais, ações compartilhadas entre as duas contas e uma arquivada.

**Uma armadilha registrada:** o `db` é cacheado em `globalThis`. O servidor de desenvolvimento avalia o módulo mais de uma vez, e cada instância do PGlite mantém sua própria imagem do banco em memória — sem o cache, uma escrita feita numa rota fica invisível para a renderização seguinte. Foi exatamente o que aconteceu na primeira tentativa de login.

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

- ~~Bug de fuso em `shiftDays`~~ — corrigido. A suíte de datas roda idêntica em `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati` e `America/Sao_Paulo`, com teste de regressão nomeado.
- ~~Ação com chute mas sem âncora~~ — resolvido como proposto: o formulário de nova ação pergunta "quando foi a última vez?", e a resposta vira a primeira ocorrência, marcada como aproximada. Sem ela, a ação existe mas não projeta data — comportamento coberto por teste.

## 11. Plano de implementação

| # | Etapa | Status |
|---|---|---|
| 1 | Scaffold: Next + Tailwind + shadcn, Drizzle + Neon, Auth.js Google com allowlist | ✅ |
| 2 | Schema + migration | 🔶 SQL gerado (`drizzle/0000_initial.sql`), não aplicado — falta banco |
| 3 | Motor de cálculo (`lib/periodicity.ts`) + testes | ✅ 42 testes |
| 4 | Lista + registrar + desfazer | ✅ telas verificadas rodando |
| 5 | Detalhe: histórico, retroativo, apagar, arquivar | ✅ telas verificadas rodando |
| 6 | Deploy na Vercel + Neon de produção | ⬜ |

**O que já foi verificado rodando** (PGlite + seed): login, lista com ordenação por urgência, filtros, detalhe com histórico, cadastro, edição, arquivadas, e a regra de visibilidade — Marina vê 4 ações compartilhadas, Julia vê 11 (7 pessoais + 4 compartilhadas).

**O que ainda não foi verificado:** as mutações. Registrar, desfazer, apagar, criar, editar e arquivar têm o caminho de dados exercitado indiretamente, mas o disparo real de Server Action a partir da interface nunca aconteceu. É o primeiro lugar onde procurar bug.

**Falta para produção:** connection string do Neon, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` do Google Cloud Console (redirect URI `http://localhost:3000/api/auth/callback/google`) e os dois e-mails em `ALLOWED_EMAILS`.
