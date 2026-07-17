"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ConsultoriaBadge from "@/components/ConsultoriaBadge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }
      router.push("/informe");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de marca */}
      <section className="relative hidden lg:flex flex-col justify-between bg-grun-950 p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #379066 0, transparent 45%), radial-gradient(circle at 80% 90%, #c9f158 0, transparent 35%)",
          }}
        />
        <div className="relative">
          <div className="inline-block bg-white rounded-2xl p-4 shadow-lg">
            <Image src="/grun-logo.jpg" alt="Grün Store" width={190} height={95} priority />
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-black text-white leading-tight">
            Panel de métricas
            <span className="block text-lima">Grün Store</span>
          </h1>
          <p className="text-grun-200 max-w-md text-sm leading-relaxed">
            Pauta de Meta, conversaciones de WhatsApp y ventas por sucursal, cruzadas por
            teléfono. Todo en un solo lugar, con análisis de IA.
          </p>
        </div>
        <div className="relative">
          <ConsultoriaBadge size="lg" />
        </div>
      </section>

      {/* Formulario */}
      <section className="flex flex-col items-center justify-center p-6 gap-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center">
            <Image src="/grun-logo.jpg" alt="Grün Store" width={150} height={75} priority />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-grun-950">Iniciar sesión</h2>
            <p className="text-sm text-gray-500 mt-1">Accedé al panel de métricas y análisis</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-grun-900 mb-1.5">Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@grun.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-grun-500 focus:ring-2 focus:ring-grun-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grun-900 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-grun-500 focus:ring-2 focus:ring-grun-200"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-grun-700 hover:bg-grun-600 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition-colors"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
        <div className="lg:hidden">
          <ConsultoriaBadge />
        </div>
      </section>
    </main>
  );
}
