import { redirect } from "next/navigation";

export default function DashboardPage() {
  // O painel principal do SugarVision de análise de trigo reside na raiz '/'
  redirect("/");
}
