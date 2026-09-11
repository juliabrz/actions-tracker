import { ActivityForm } from "@/components/activity-form"
import { Star } from "@/components/stickers"

export default function NewActivityPage() {
  return (
    <div className="mx-auto w-full max-w-md p-4">
      <ActivityForm
        title="Nova atividade"
        sticker={<Star className="size-5 text-butter" />}
      />
    </div>
  )
}
