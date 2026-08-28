import { ActivityForm } from "@/components/activity-form"
import { Star } from "@/components/stickers"
import { WindowPanel } from "@/components/window-panel"

export default function NewActivityPage() {
  return (
    <div className="mx-auto w-full max-w-md p-4">
      <WindowPanel title="Nova ação" sticker={<Star className="size-5 text-butter" />}>
        <ActivityForm />
      </WindowPanel>
    </div>
  )
}
