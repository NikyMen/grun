import { redirect } from "next/navigation";

// La pantalla principal es el Informe (inversión vs facturación cruzada por teléfono)
export default function Home() {
  redirect("/informe");
}
