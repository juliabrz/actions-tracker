import { ActivityForm } from "@/components/activity-form"

export default function NewActivityPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <h1 className="text-xl font-semibold">Nova ação</h1>
      <ActivityForm />
    </div>
  )
}
