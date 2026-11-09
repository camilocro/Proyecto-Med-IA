import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RecuperarForm from "@/components/auth/RecuperarForm";

export default function RecuperarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <RecuperarForm />
      </main>
      <Footer />
    </div>
  );
}
