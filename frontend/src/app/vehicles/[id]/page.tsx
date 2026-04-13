interface Props {
  params: Promise<{ id: string }>
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <h1 className="text-2xl font-bold text-zinc-900">Vehicle #{id}</h1>
      <p className="mt-2 text-zinc-500">Coming soon…</p>
    </main>
  )
}
