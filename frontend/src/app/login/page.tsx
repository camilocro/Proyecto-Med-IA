import AuthForm from '@/components/auth/AuthForm'
import Navbar   from '@/components/layout/Navbar'
import Footer   from '@/components/layout/Footer'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <AuthForm tabInicial="login" />
      </main>
      <Footer />
    </div>
  )
}
