import { ActivityForm } from "@/components/activity-form"

export default function NewActivityPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <h1 className="font-heading text-base text-ink dark:text-foreground">nova ação</h1>
      <ActivityForm />
    </div>
  )
}
