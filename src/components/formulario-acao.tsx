"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { atualizarAcao, criarAcao } from "@/app/(app)/acoes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hoje } from "@/lib/datas"

type Escopo = "pessoal" | "compartilhada"

type Props = {
  acao?: {
    id: string
    nome: string
    escopo: Escopo
    intervaloChuteDias: number | null
    alertaDiasAntes: number | null
  }
}

function numeroOuNulo(v: string): number | null {
  const n = Number(v)
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export function FormularioAcao({ acao }: Props) {
  const editando = Boolean(acao)
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [avancado, setAvancado] = useState(false)

  const [nome, setNome] = useState(acao?.nome ?? "")
  const [escopo, setEscopo] = useState<Escopo>(acao?.escopo ?? "pessoal")
  const [ultimaVez, setUltimaVez] = useState("")
  const [chute, setChute] = useState(acao?.intervaloChuteDias?.toString() ?? "")
  const [alerta, setAlerta] = useState(acao?.alertaDiasAntes?.toString() ?? "")

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    iniciar(async () => {
      const comum = {
        nome,
        escopo,
        intervaloChuteDias: numeroOuNulo(chute),
        alertaDiasAntes: numeroOuNulo(alerta),
      }

      const r = acao
        ? await atualizarAcao({ acaoId: acao.id, ...comum })
        : await criarAcao({ ...comum, ultimaVez: ultimaVez || null })

      if (!r.ok) {
        toast.error(r.erro)
        return
      }

      toast.success(editando ? "Ação atualizada." : "Ação criada.")
      router.push(acao ? `/acoes/${acao.id}` : "/")
      router.refresh()
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">O que é?</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Cortar o cabelo"
          autoFocus={!editando}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="escopo">Quem acompanha</Label>
        <Select value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
          <SelectTrigger id="escopo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pessoal">Só eu</SelectItem>
            <SelectItem value="compartilhada">Nós duas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!editando && (
        <div className="space-y-2">
          <Label htmlFor="ultimaVez">Quando foi a última vez?</Label>
          <Input
            id="ultimaVez"
            type="date"
            max={hoje()}
            value={ultimaVez}
            onChange={(e) => setUltimaVez(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Opcional, mas sem isso não há de onde contar. Fica marcada como data
            aproximada.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAvancado((v) => !v)}
        className="text-sm text-muted-foreground hover:underline"
      >
        {avancado ? "− menos opções" : "+ mais opções"}
      </button>

      {avancado && (
        <div className="space-y-5 rounded-md border p-4">
          <div className="space-y-2">
            <Label htmlFor="chute">De quanto em quanto tempo você acha que faz?</Label>
            <Input
              id="chute"
              type="number"
              min={1}
              inputMode="numeric"
              value={chute}
              onChange={(e) => setChute(e.target.value)}
              placeholder="dias"
            />
            <p className="text-xs text-muted-foreground">
              Só um palpite para os primeiros dias. É descartado assim que existir
              um ciclo medido de verdade.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alerta">Me avise com quantos dias de antecedência?</Label>
            <Input
              id="alerta"
              type="number"
              min={1}
              inputMode="numeric"
              value={alerta}
              onChange={(e) => setAlerta(e.target.value)}
              placeholder="automático (15% do intervalo)"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente || !nome.trim()}>
          {pendente ? "Salvando..." : editando ? "Salvar" : "Criar ação"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
