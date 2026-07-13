import { redirect } from "next/navigation";

// La pantalla principal es Pauta Meta (inversión vs facturación cruzada por teléfono)
export default function Home() {
  redirect("/pauta");
}
