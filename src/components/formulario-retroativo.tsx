"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { registrarOcorrencia } from "@/app/(app)/acoes/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hoje } from "@/lib/datas"

/**
 * Cadastro retroativo. Data exata + marcação de "aproximada": guardar a data
 * como fato e a incerteza como flag entrega quase tudo que precisão declarada
 * entregaria, por uma fração do custo (spec §3).
 */
export function FormularioRetroativo({ acaoId }: { acaoId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [data, setData] = useState("")
  const [aproximada, setAproximada] = useState(true)
  const [valor, setValor] = useState("")

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    iniciar(async () => {
      const r = await registrarOcorrencia({ acaoId, data, aproximada, valor: valor || null })
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      toast.success("Registro adicionado.")
      setData("")
      setValor("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">Adicionar um registro antigo</p>

      <div className="flex gap-2">
        <Input
          type="date"
          max={hoje()}
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="R$ (opcional)"
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="aproximada"
          checked={aproximada}
          onCheckedChange={(v) => setAproximada(v === true)}
        />
        <Label htmlFor="aproximada" className="text-sm font-normal text-muted-foreground">
          Data aproximada (lembrei de cabeça)
        </Label>
      </div>

      <Button type="submit" size="sm" variant="secondary" disabled={pendente || !data}>
        {pendente ? "Salvando..." : "Adicionar"}
      </Button>
    </form>
  )
}
