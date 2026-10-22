async function testRoute(url, options = {}) {
  try {
    const res = await fetch(url, { redirect: "manual", ...options });
    const location = res.headers.get("location");
    return { status: res.status, location };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  console.log("=== TESTES DE ROTA E REDIRECIONAMENTO (SPRINT 8) ===");

  // 1. Acesso à raiz sem sessão -> deve redirecionar para /login?redirectTo=%2F
  const r1 = await testRoute("http://localhost:3000/");
  console.log("1. GET / (sem autenticação):", r1);

  // 2. Acesso a /dashboard sem sessão -> deve redirecionar para /login?redirectTo=%2Fdashboard
  const r2 = await testRoute("http://localhost:3000/dashboard");
  console.log("2. GET /dashboard (sem autenticação):", r2);

  // 3. Acesso a /amostras sem sessão -> deve redirecionar para /login?redirectTo=%2Famostras
  const r3 = await testRoute("http://localhost:3000/amostras");
  console.log("3. GET /amostras (sem autenticação):", r3);

  // 4. Acesso a /login sem sessão -> 200 OK
  const r4 = await testRoute("http://localhost:3000/login");
  console.log("4. GET /login (sem autenticação):", r4);

  // 5. Acesso a /register sem sessão -> 200 OK
  const r5 = await testRoute("http://localhost:3000/register");
  console.log("5. GET /register (sem autenticação):", r5);

  // 6. Acesso à raiz COM sessão autenticada (cookie) -> 200 OK
  const authHeaders = {
    headers: {
      Cookie: "sugarvision_auth_session=%7B%22id%22%3A%22test-usr-1%22%2C%22email%22%3A%22operador%40sugarvision.agro%22%7D",
    },
  };
  const r6 = await testRoute("http://localhost:3000/", authHeaders);
  console.log("6. GET / (autenticado com cookie):", r6);

  // 7. Acesso a /dashboard COM sessão autenticada -> redireciona para / (painel principal)
  const r7 = await testRoute("http://localhost:3000/dashboard", authHeaders);
  console.log("7. GET /dashboard (autenticado com cookie):", r7);

  // 8. Acesso a /login COM sessão autenticada -> redireciona para / (já logado)
  const r8 = await testRoute("http://localhost:3000/login", authHeaders);
  console.log("8. GET /login (autenticado com cookie):", r8);

  // 9. Acesso a /register COM sessão autenticada -> redireciona para / (já logado)
  const r9 = await testRoute("http://localhost:3000/register", authHeaders);
  console.log("9. GET /register (autenticado com cookie):", r9);

  const passed =
    r1.status === 307 &&
    r1.location?.includes("/login") &&
    r2.status === 307 &&
    r2.location?.includes("/login") &&
    r3.status === 307 &&
    r3.location?.includes("/login") &&
    r4.status === 200 &&
    r5.status === 200 &&
    r6.status === 200 &&
    r8.status === 307 &&
    r8.location?.endsWith("/");

  console.log("\nTODOS OS CRITÉRIOS DE ROTA PASSARAM?", passed ? "SIM! SUCESSO!" : "FALHA");
  if (!passed) process.exit(1);
}

run();
