# Guia de Deploy na Vercel - Sprint 9

- **Responsável:** 🎨 Membro 1 (Front A / Cesar)
- **Projeto:** SugarVision Frontend (Next.js 16)
- **Status da Validação Pré-Deploy:** Aprovado (100% de sucesso no build)

---

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

## 4. Testes de Aceitação da Sprint 9

- [ ] **Acesso Web e Mobile:** Abrir o domínio público gerado pelo navegador do computador e do celular.
- [ ] **Redirecionamento do Middleware:** Tentar acessar `/dashboard` diretamente sem estar autenticado e certificar-se de que é redirecionado para `/login`.
- [ ] **Autenticação:** Realizar cadastro de teste em `/register` ou login em `/login` usando a integração do Supabase.
- [ ] **Painel Principal:** Confirmar que, após a autenticação, o dashboard carrega as métricas de sanidade vegetal e mapas agronômicos.
