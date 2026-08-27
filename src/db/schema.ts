import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

/* ------------------------------------------------------------------ */
/* Auth.js — nomes e formato exigidos pelo @auth/drizzle-adapter        */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

/* ------------------------------------------------------------------ */
/* Domínio                                                              */
/* ------------------------------------------------------------------ */

export const escopoEnum = pgEnum("escopo", ["pessoal", "compartilhada"])

export const acoes = pgTable(
  "acoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donoId: text("dono_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    escopo: escopoEnum("escopo").notNull().default("pessoal"),
    /** Chute inicial do usuário. Descartado assim que existe 1 intervalo real. */
    intervaloChuteDias: integer("intervalo_chute_dias"),
    /** Override do alerta. Sem ele, usa 15% do intervalo estimado. */
    alertaDiasAntes: integer("alerta_dias_antes"),
    arquivada: boolean("arquivada").notNull().default(false),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("acoes_dono_idx").on(t.donoId)],
)

export const ocorrencias = pgTable(
  "ocorrencias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    acaoId: uuid("acao_id")
      .notNull()
      .references(() => acoes.id, { onDelete: "cascade" }),
    /** DATE puro (YYYY-MM-DD). Sem hora, sem fuso — decisão Q24. */
    data: date("data", { mode: "string" }).notNull(),
    feitaPorId: text("feita_por_id")
      .notNull()
      .references(() => users.id),
    /** Data lembrada de cabeça: conta no cálculo, mas rebaixa a confiança. */
    aproximada: boolean("aproximada").notNull().default(false),
    valor: numeric("valor", { precision: 10, scale: 2 }),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ocorrencias_acao_data_uq").on(t.acaoId, t.data)],
)

/* ------------------------------------------------------------------ */
/* Relations                                                            */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  acoes: many(acoes),
  ocorrencias: many(ocorrencias),
}))

export const acoesRelations = relations(acoes, ({ one, many }) => ({
  dono: one(users, { fields: [acoes.donoId], references: [users.id] }),
  ocorrencias: many(ocorrencias),
}))

export const ocorrenciasRelations = relations(ocorrencias, ({ one }) => ({
  acao: one(acoes, { fields: [ocorrencias.acaoId], references: [acoes.id] }),
  feitaPor: one(users, {
    fields: [ocorrencias.feitaPorId],
    references: [users.id],
  }),
}))

export type Acao = typeof acoes.$inferSelect
export type Ocorrencia = typeof ocorrencias.$inferSelect
