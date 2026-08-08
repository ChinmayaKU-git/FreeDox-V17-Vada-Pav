import Navbar from '@/components/Navbar'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 container mx-auto">
        {children}
      </main>
    </div>
  )
}
