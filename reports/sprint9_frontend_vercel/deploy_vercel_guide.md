# Guia de Deploy na Vercel - Sprint 9

- **Responsável:** 🎨 Membro 1 (Front A / Cesar)
- **Projeto:** SugarVision Frontend (Next.js 16)
- **Status do Deploy:** ✅ Concluído e Publicado com Sucesso
- **URL Oficial de Produção:** [https://sugarvision-sikq.vercel.app/](https://sugarvision-sikq.vercel.app/)

---

## 0. Validação em Tempo Real das Rotas Online
- `GET /` -> `200 OK` (Página inicial do SugarVision / MyAgro carregada)
- `GET /login` -> `200 OK` (Tela de autenticação via Supabase pronta)
- `GET /register` -> `200 OK` (Tela de cadastro de operadores pronta)
- `GET /dashboard` -> `307 Temporary Redirect` (Middleware de proteção de rotas ativado redirecionando usuários não autenticados)


## 1. Conexão do Repositório na Vercel

1. Acesse **[vercel.com/new](https://vercel.com/new)** logado com a conta do GitHub.
2. Selecione o repositório do projeto: `jogo_damas/sugarvision`.
3. Na tela de configuração do projeto (**Configure Project**):
   - **Project Name:** `sugarvision` (ou nome desejado, ex: `myagro`)
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Clique em **Edit** e selecione a pasta `frontend` *(indispensável para monorepo)*.

---

## 2. Variáveis de Ambiente a Cadastrar na Vercel

Na seção **Environment Variables**, cadastre as 3 variáveis abaixo para os ambientes *Production*, *Preview* e *Development*:

| Nome da Variável | Valor | Finalidade |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hbropsjrbebbuiwcjrcu.supabase.co` | Endpoint da instância Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xo6L_52qGPQtncGNrLa9RA_nitsGMHH` | Chave pública de autenticação Supabase |
| `NEXT_PUBLIC_API_URL` | *(URL pública HTTPS do backend)* | Comunicação com o FastAPI |

> **Nota sobre o Backend:**
> - Se estiver usando o Cloudflare Tunnel local, execute `.\backend\scripts\start_tunnel.ps1` e configure a URL gerada (ex: `https://xxxx.trycloudflare.com`).
> - Se o backend for hospedado em serviço de nuvem (Render/Railway), insira a URL HTTPS fornecida por esse serviço.

---

## 3. Disparo do Deploy

1. Clique no botão **Deploy**.
2. Aguarde aproximadamente 1 minuto enquanto a Vercel executa `npm install` e `npm run build`.
3. Ao finalizar, será disponibilizado o domínio público em HTTPS (ex: `https://sugarvision.vercel.app`).

---

## 4. Testes de Aceitação da Sprint 9 (Validados e Aprovados)

- [x] **Acesso Web e Mobile:** Domínio público oficial [https://sugarvision-sikq.vercel.app/](https://sugarvision-sikq.vercel.app/) acessado com sucesso em visualização desktop (1280x850+) e mobile (390x844).
- [x] **Redirecionamento do Middleware:** Testado via script e navegador; acesso direto a rotas protegidas redireciona com status HTTP `307` para a raiz ou `/login`.
- [x] **Autenticação:** Login e modo de acesso rápido para avaliação testados com sucesso via Supabase SSR, gerando cookie seguro de sessão (`sugarvision_auth_session`).
- [x] **Painel Principal:** Confirmada renderização completa dos KPIs de sanidade vegetal, navegação lateral e painel de análise de campo em ambos os formatos (computador e smartphone).

---

## 5. Resumo da Verificação em Produção (Sprint 9)

| Item Verificado | Resultado | Detalhes |
| :--- | :--- | :--- |
| **Build Next.js 16 (Turbopack)** | ✅ Aprovado | Compilação limpa, zero erros de tipagem TypeScript e lint |
| **HTTPS & Domínio Vercel** | ✅ Ativo e Estável | `https://sugarvision-sikq.vercel.app/` |
| **Variáveis de Ambiente** | ✅ Integradas | Supabase URL, Anon Key e API Backend configurados |
| **Responsividade Mobile** | ✅ 100% Responsivo | Testado nas dimensões 390x844 (iOS/Android viewport) |
