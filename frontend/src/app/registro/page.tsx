import AuthForm from '@/components/auth/AuthForm'
import Navbar    from '@/components/layout/Navbar'
import Footer    from '@/components/layout/Footer'

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EBF5FB]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <AuthForm tabInicial="registro" />
      </main>
      <Footer />
    </div>
  )
}
