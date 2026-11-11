import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CallbackGoogle from "@/components/auth/CallbackGoogle";

export default function CallbackGooglePage() {
  return (
    <div className="min-h-screen flex flex-col bg-light/30">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={null}>
          <CallbackGoogle />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
