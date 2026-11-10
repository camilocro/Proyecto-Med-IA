import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RestablecerForm from "@/components/auth/RestablecerForm";

export default function RestablecerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {/* Next.js exige Suspense alrededor de useSearchParams (lee el token de la URL) */}
        <Suspense fallback={null}>
          <RestablecerForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
