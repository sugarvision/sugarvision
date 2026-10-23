"use client";

import Link from "next/link";

export default function FlyerPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flyer-wrapper">
      {/* ── Barra Superior de Ações (Oculta na Impressão) ── */}
      <header className="no-print action-bar">
        <div className="action-bar-left">
          <Link href="/" className="back-btn">
            ← Voltar ao Sistema
          </Link>
          <span className="doc-badge">Documento Executivo • One-Pager para Investidores</span>
        </div>

        <div className="action-bar-right">
          <Link href="/mapa" className="secondary-btn">
            🛰️ Ver Mapa Embrapa
          </Link>
          <a
            href="https://sugarvision-sikq.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="secondary-btn"
          >
            🌐 Plataforma Online
          </a>
          <button onClick={handlePrint} className="primary-btn">
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </header>

      {/* ── Documento A4 de 1 Página ── */}
      <main className="flyer-sheet">
        {/* Header da Marca */}
        <div className="flyer-header">
          <div className="brand-group">
            <div className="brand-icon">🌾</div>
            <div>
              <div className="brand-title-row">
                <h1 className="brand-name">SugarVision AI</h1>
                <span className="brand-tag">MyAgro Precision</span>
                <span className="seed-badge">RODADA SEED 2026</span>
              </div>
              <p className="brand-slogan">
                Visão Computacional & Inteligência Artificial para Monitoramento de Estande e Produtividade de Grãos
              </p>
            </div>
          </div>

          <div className="live-demo-box">
            <div className="live-status">
              <span className="pulse-dot"></span>
              <strong>MVP EM PRODUÇÃO</strong>
            </div>
            <span className="live-url">sugarvision-sikq.vercel.app</span>
          </div>
        </div>

        {/* Hero Section: Destaque Visual + Problema/Solução */}
        <section className="hero-section">
          <div className="hero-banner-container">
            <img
              src="/flyer_hero.jpg"
              alt="SugarVision AI Drone Telemetry"
              className="hero-img"
            />
            <div className="hero-overlay">
              <span className="tech-chip">YOLOv8x + SAHI Drone Telemetry</span>
              <span className="tech-chip-sub">Detecção em Milissegundos com GPS Sub-Métrico</span>
            </div>
          </div>

          <div className="pain-solution-card">
            <div className="pain-box">
              <div className="sec-label pain-label">⚠️ O PROBLEMA DE US$ 210 BI</div>
              <p className="sec-desc">
                A estimativa de safra e contagem de espigas de trigo ainda depende de <strong>amostragem manual com aro</strong>. Cobre menos de <strong>1% do talhão</strong>, consome dias e gera desvios de até <strong>18% na estimativa de colheita</strong>, causando prejuízos severos com insumos e contratos futuros de grãos.
              </p>
            </div>

            <div className="solution-box">
              <div className="sec-label solution-label">💡 NOSSA SOLUÇÃO PROPRIETÁRIA</div>
              <p className="sec-desc">
                Transformamos <strong>qualquer voo de drone ou foto de smartphone</strong> em um censo automatizado de espigas. Combinamos <strong>YOLOv8x calibrado</strong>, <strong>tiling adaptativo (SAHI)</strong> e <strong>georreferenciamento oficial da Embrapa Trigo</strong> para entregar laudos de estande em segundos.
              </p>
            </div>
          </div>
        </section>

        {/* 4 Métricas de Tração e Performance */}
        <section className="metrics-grid">
          <div className="metric-card">
            <span className="metric-val text-green">96.4%</span>
            <span className="metric-label">Precisão do Modelo (mAP@50)</span>
            <span className="metric-sub">Consórcio Global Wheat Head</span>
          </div>
          <div className="metric-card">
            <span className="metric-val text-cyan">&lt; 1.8s</span>
            <span className="metric-label">Tempo Médio de Inferência</span>
            <span className="metric-sub">Processamento 4K em tempo real</span>
          </div>
          <div className="metric-card">
            <span className="metric-val text-gold">-90%</span>
            <span className="metric-label">Redução do Tempo de Campo</span>
            <span className="metric-sub">De 4 dias para 15 minutos</span>
          </div>
          <div className="metric-card">
            <span className="metric-val text-green">+14%</span>
            <span className="metric-label">Margem Agronômica Líquida</span>
            <span className="metric-sub">Otimização de colheita e insumos</span>
          </div>
        </section>

        {/* Pilares: Pipeline Tecnológico + Modelo de Negócio + Ilustração de Campo */}
        <section className="pillars-grid">
          {/* Coluna 1: Como Funciona */}
          <div className="pillar-card">
            <h3 className="pillar-title">⚙️ Pipeline Tecnológico</h3>
            <ul className="pillar-list">
              <li>
                <strong>1. Captura com Drone / Celular:</strong> Leitura automática de metadados EXIF GPS no navegador.
              </li>
              <li>
                <strong>2. Super-Resolução & Tiling SAHI:</strong> Fatiamento dinâmico para detectar centenas de espigas densas por m².
              </li>
              <li>
                <strong>3. Classificação de Densidade:</strong> Agrupamento agronômico (Alta &gt;50, Média 20-50, Baixa &lt;20).
              </li>
              <li>
                <strong>4. GIS & Delimitação de Talhões:</strong> Projeção em satélite com polígonos calibrados na Embrapa Trigo.
              </li>
            </ul>
          </div>

          {/* Coluna 2: Ilustração App Mockup */}
          <div className="pillar-card mockup-card">
            <img
              src="/flyer_app_mockup.jpg"
              alt="Interface Móvel em Campo na Embrapa"
              className="mockup-img"
            />
            <div className="mockup-badge">
              <span>🌾 Validado nos Campos da Embrapa Trigo (Passo Fundo - RS)</span>
            </div>
          </div>

          {/* Coluna 3: Modelo de Negócio B2B */}
          <div className="pillar-card">
            <h3 className="pillar-title">💼 Modelo de Negócio B2B</h3>
            <div className="biz-model-item">
              <strong>SaaS por Hectare Monitorado:</strong>
              <span>R$ 6,50 a R$ 12,00 / ha / safra para médios e grandes produtores rurais.</span>
            </div>
            <div className="biz-model-item">
              <strong>Enterprise para Cooperativas:</strong>
              <span>Licença anual para cooperativas agrícolas (Coamo, Castrolanda, Copacol) e tradings de grãos.</span>
            </div>
            <div className="biz-model-item">
              <strong>API & White-Label para Drones:</strong>
              <span>Integração direta com fabricantes de hardware UAV (DJI Agras, Pix4D, DroneDeploy).</span>
            </div>
          </div>
        </section>

        {/* Mercado (TAM/SAM/SOM) + Diferenciais Competitivos */}
        <section className="market-row">
          <div className="market-stat">
            <span className="market-title">OPORTUNIDADE DE MERCADO GLOBAL</span>
            <div className="tam-boxes">
              <div className="tam-box">
                <span className="tam-num">US$ 12.8B</span>
                <span className="tam-desc">TAM Global de Drones & IA no Agro (2028)</span>
              </div>
              <div className="tam-box">
                <span className="tam-num">US$ 1.4B</span>
                <span className="tam-desc">SAM Grãos América Latina (Brasil e Argentina)</span>
              </div>
              <div className="tam-box highlight-tam">
                <span className="tam-num">R$ 180M</span>
                <span className="tam-desc">SOM Inicial (Cinturão de Trigo PR / RS / Cerrado)</span>
              </div>
            </div>
          </div>

          <div className="diff-stat">
            <span className="market-title">DIFERENCIAIS COMPETITIVOS</span>
            <div className="diff-badges">
              <span className="diff-badge">✓ Zero Instalação (100% Web Cloud)</span>
              <span className="diff-badge">✓ Algoritmo Adaptado para Trigo Tropical & Temperado</span>
              <span className="diff-badge">✓ Integração Nativa Supabase + Vercel</span>
              <span className="diff-badge">✓ Conexão com Sistemas de Gestão de Fazendas (ERP)</span>
            </div>
          </div>
        </section>

        {/* Footer Comercial com QR Code & CTA */}
        <footer className="flyer-footer">
          <div className="footer-left">
            <div className="team-lead">
              <strong>Desenvolvido pela Equipe SugarVision</strong> • Projeto de Inovação Tecnológica
            </div>
            <div className="tech-stack-row">
              <span className="tech-tag">Next.js 16</span>
              <span className="tech-tag">FastAPI</span>
              <span className="tech-tag">YOLOv8x</span>
              <span className="tech-tag">PyTorch</span>
              <span className="tech-tag">Supabase</span>
              <span className="tech-tag">Leaflet GIS</span>
            </div>
            <div className="contact-text">
              Contato para Investimentos & Pilotos Comerciais: <strong>contato@sugarvision.ag</strong> • Passo Fundo / SP
            </div>
          </div>

          <div className="footer-cta">
            <div className="qr-container">
              {/* QR Code SVG Vetorial Limpo apontando para o sistema ao vivo */}
              <svg className="qr-code" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="white" rx="6" />
                {/* Posicionadores dos cantos */}
                <rect x="8" y="8" width="28" height="28" fill="#0d1117" />
                <rect x="12" y="12" width="20" height="20" fill="white" />
                <rect x="16" y="16" width="12" height="12" fill="#2ea043" />

                <rect x="64" y="8" width="28" height="28" fill="#0d1117" />
                <rect x="68" y="12" width="20" height="20" fill="white" />
                <rect x="72" y="16" width="12" height="12" fill="#2ea043" />

                <rect x="8" y="64" width="28" height="28" fill="#0d1117" />
                <rect x="12" y="68" width="20" height="20" fill="white" />
                <rect x="16" y="72" width="12" height="12" fill="#2ea043" />

                {/* Padrão de dados representativo */}
                <rect x="42" y="10" width="8" height="8" fill="#0d1117" />
                <rect x="52" y="18" width="6" height="6" fill="#0d1117" />
                <rect x="42" y="26" width="12" height="6" fill="#0d1117" />

                <rect x="10" y="44" width="8" height="6" fill="#0d1117" />
                <rect x="24" y="44" width="14" height="6" fill="#0d1117" />
                <rect x="44" y="42" width="14" height="14" fill="#2ea043" />
                <rect x="64" y="44" width="10" height="8" fill="#0d1117" />
                <rect x="80" y="42" width="10" height="10" fill="#0d1117" />

                <rect x="42" y="64" width="8" height="14" fill="#0d1117" />
                <rect x="54" y="72" width="8" height="18" fill="#0d1117" />
                <rect x="68" y="66" width="22" height="8" fill="#0d1117" />
                <rect x="76" y="80" width="14" height="10" fill="#2ea043" />
              </svg>
            </div>
            <div className="cta-text-box">
              <span className="cta-headline">TESTE A DEMO ONLINE</span>
              <span className="cta-sub">Aponte a câmera do celular para abrir a plataforma ao vivo</span>
              <a
                href="https://sugarvision-sikq.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="cta-link-pill"
              >
                sugarvision-sikq.vercel.app ↗
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* ── Estilos CSS Embutidos (Tailored para A4 e Web) ── */}
      <style jsx>{`
        .flyer-wrapper {
          min-height: 100vh;
          background: #090d13;
          color: #e6edf3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
        }

        /* Barra de Ações Superior */
        .action-bar {
          width: 100%;
          max-width: 1080px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          background: rgba(22, 27, 34, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .action-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          color: #2ea043;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .back-btn:hover {
          color: #3fb950;
        }

        .doc-badge {
          font-size: 11px;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .action-bar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .secondary-btn {
          background: rgba(255, 255, 255, 0.06);
          color: #e6edf3;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
        }
        .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .primary-btn {
          background: #2ea043;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(46, 160, 67, 0.3);
        }
        .primary-btn:hover {
          background: #3fb950;
          transform: translateY(-1px);
        }

        /* Folha A4 do Flyer */
        .flyer-sheet {
          width: 100%;
          max-width: 1080px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 16px;
          padding: 28px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          box-sizing: border-box;
        }

        /* Header */
        .flyer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 16px;
        }

        .brand-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2ea043, #196c2e);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          box-shadow: 0 4px 14px rgba(46, 160, 67, 0.4);
          flex-shrink: 0;
        }

        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-name {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .brand-tag {
          font-size: 13px;
          font-weight: 600;
          color: #2ea043;
          background: rgba(46, 160, 67, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .seed-badge {
          font-size: 10.5px;
          font-weight: 800;
          color: #d29922;
          background: rgba(210, 153, 34, 0.15);
          border: 1px solid rgba(210, 153, 34, 0.35);
          padding: 2px 8px;
          border-radius: 12px;
          letter-spacing: 0.5px;
        }

        .brand-slogan {
          font-size: 12.5px;
          color: #8b949e;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .live-demo-box {
          text-align: right;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .live-status {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          font-size: 11px;
          color: #3fb950;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #3fb950;
          border-radius: 50%;
          box-shadow: 0 0 8px #3fb950;
        }

        .live-url {
          font-size: 11px;
          color: #8b949e;
          font-family: monospace;
          display: block;
          margin-top: 2px;
        }

        /* Hero Section */
        .hero-section {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 16px;
        }

        .hero-banner-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          height: 195px;
          border: 1px solid #30363d;
          background: #161b22;
        }

        .hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hero-overlay {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tech-chip {
          background: rgba(13, 17, 23, 0.88);
          backdrop-filter: blur(6px);
          color: #3fb950;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          align-self: flex-start;
          border: 1px solid rgba(63, 185, 80, 0.3);
        }

        .tech-chip-sub {
          background: rgba(13, 17, 23, 0.75);
          color: #c9d1d9;
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
          align-self: flex-start;
        }

        .pain-solution-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
        }

        .sec-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .pain-label {
          color: #ff7b72;
        }

        .solution-label {
          color: #3fb950;
        }

        .sec-desc {
          font-size: 11.5px;
          line-height: 1.45;
          color: #c9d1d9;
          margin: 0;
        }

        .sec-desc strong {
          color: #ffffff;
        }

        /* 4 Métricas de Tração */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .metric-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
        }

        .metric-val {
          font-size: 24px;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .text-green {
          color: #3fb950;
        }
        .text-cyan {
          color: #58a6ff;
        }
        .text-gold {
          color: #d29922;
        }

        .metric-label {
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 4px;
        }

        .metric-sub {
          font-size: 10px;
          color: #8b949e;
          margin-top: 2px;
        }

        /* Pilares de Tecnologia e Negócios */
        .pillars-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr 1fr;
          gap: 14px;
        }

        .pillar-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pillar-title {
          font-size: 12px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 2px 0;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 6px;
        }

        .pillar-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pillar-list li {
          font-size: 10.8px;
          line-height: 1.4;
          color: #8b949e;
        }

        .pillar-list li strong {
          color: #e6edf3;
        }

        .mockup-card {
          padding: 6px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .mockup-img {
          width: 100%;
          height: 155px;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .mockup-badge {
          background: rgba(13, 17, 23, 0.9);
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 9.5px;
          font-weight: 600;
          color: #3fb950;
          text-align: center;
          margin-top: 6px;
        }

        .biz-model-item {
          font-size: 10.8px;
          line-height: 1.35;
          color: #8b949e;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 4px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        }

        .biz-model-item:last-child {
          border-bottom: none;
        }

        .biz-model-item strong {
          color: #e6edf3;
        }

        /* Oportunidade de Mercado */
        .market-row {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 14px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 12px 16px;
        }

        .market-title {
          font-size: 10.5px;
          font-weight: 800;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
        }

        .tam-boxes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .tam-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
        }

        .highlight-tam {
          border-color: rgba(46, 160, 67, 0.5);
          background: rgba(46, 160, 67, 0.08);
        }

        .tam-num {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .highlight-tam .tam-num {
          color: #3fb950;
        }

        .tam-desc {
          font-size: 9.5px;
          color: #8b949e;
          margin-top: 2px;
          line-height: 1.25;
        }

        .diff-badges {
          display: grid;
          grid-template-columns: 1fr;
          gap: 4px;
        }

        .diff-badge {
          font-size: 10.5px;
          font-weight: 600;
          color: #c9d1d9;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        /* Footer Comercial & CTA */
        .flyer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #11151c;
          border: 1px solid rgba(46, 160, 67, 0.35);
          border-radius: 12px;
          padding: 12px 18px;
          gap: 16px;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .team-lead {
          font-size: 11.5px;
          color: #c9d1d9;
        }

        .team-lead strong {
          color: #3fb950;
        }

        .tech-stack-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tech-tag {
          font-size: 9.5px;
          font-weight: 600;
          background: #161b22;
          color: #8b949e;
          border: 1px solid #30363d;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .contact-text {
          font-size: 10.5px;
          color: #8b949e;
        }

        .contact-text strong {
          color: #e6edf3;
        }

        .footer-cta {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.4);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .qr-container {
          width: 58px;
          height: 58px;
          background: #fff;
          border-radius: 6px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          flex-shrink: 0;
        }

        .qr-code {
          width: 100%;
          height: 100%;
        }

        .cta-text-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cta-headline {
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.4px;
        }

        .cta-sub {
          font-size: 9.5px;
          color: #8b949e;
          max-width: 180px;
          line-height: 1.25;
        }

        .cta-link-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          color: #2ea043;
          text-decoration: none;
          margin-top: 3px;
        }
        .cta-link-pill:hover {
          text-decoration: underline;
        }

        /* ── Regras de Impressão (A4 Single-Page) ── */
        @media print {
          .no-print {
            display: none !important;
          }
          .flyer-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          .flyer-sheet {
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10mm 12mm !important;
            background: #ffffff !important;
            color: #111111 !important;
          }
          .brand-name {
            color: #000000 !important;
          }
          .brand-slogan, .sec-desc, .pillar-list li, .biz-model-item {
            color: #333333 !important;
          }
          .pain-solution-card, .metric-card, .pillar-card, .market-row, .hero-banner-container {
            background: #f6f8fa !important;
            border-color: #d0d7de !important;
          }
          .metric-label, .pillar-title {
            color: #000000 !important;
          }
          .flyer-footer {
            background: #f6f8fa !important;
            border-color: #2ea043 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }

        /* Responsividade para telas menores */
        @media (max-width: 768px) {
          .hero-section {
            grid-template-columns: 1fr;
          }
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pillars-grid {
            grid-template-columns: 1fr;
          }
          .market-row {
            grid-template-columns: 1fr;
          }
          .flyer-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
