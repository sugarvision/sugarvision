'use client';

import React, { useState, useEffect } from 'react';

interface FinancialSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  densidadeInicial: number;
}

export default function FinancialSimulatorModal({ isOpen, onClose, densidadeInicial }: FinancialSimulatorProps) {
  // Estados para os sliders interativos
  const [densidade, setDensidade] = useState(densidadeInicial || 350);
  const [precoSaca, setPrecoSaca] = useState(85.00);
  const [custoHa, setCustoHa] = useState(4200.00);

  // Sincroniza se a densidade inicial mudar ao trocar de imagem
  useEffect(() => {
    if (densidadeInicial) setDensidade(densidadeInicial);
  }, [densidadeInicial]);

  if (!isOpen) return null;

  // --- Motor de Cálculo em Tempo Real ---
  const graosPorEspiga = 35;
  const pmg = 40.0;
  
  const kgHa = (densidade * graosPorEspiga * pmg) / 100.0;
  const sacasHa = kgHa / 60.0;
  const receita = sacasHa * precoSaca;
  const lucro = receita - custoHa;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const breakEven = precoSaca > 0 ? custoHa / precoSaca : 0;

  // Formatação de moeda
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Painel Esquerdo: Controles e Sliders */}
        <div className="w-full md:w-5/12 p-6 border-r border-[#30363d] bg-[#161b22]">
          <h2 className="text-xl font-bold text-white mb-2">Simulador Financeiro</h2>
          <p className="text-xs text-gray-400 mb-6">Ajuste os parâmetros de mercado para projetar o lucro líquido por hectare.</p>

          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-2">
                <span>Densidade (Espigas/m²)</span>
                <span className="text-[#58a6ff]">{densidade.toFixed(1)}</span>
              </label>
              <input type="range" min="100" max="800" step="1" value={densidade} onChange={(e) => setDensidade(Number(e.target.value))} className="w-full accent-[#58a6ff]" />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-2">
                <span>Preço da Saca (60kg)</span>
                <span className="text-[#3fb950]">{formatBRL(precoSaca)}</span>
              </label>
              <input type="range" min="40" max="150" step="0.5" value={precoSaca} onChange={(e) => setPrecoSaca(Number(e.target.value))} className="w-full accent-[#3fb950]" />
              <p className="text-[10px] text-gray-500 mt-1">Base CEPEA/CONAB - Ref. 2026</p>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-2">
                <span>Custo de Produção (R$/ha)</span>
                <span className="text-[#f85149]">{formatBRL(custoHa)}</span>
              </label>
              <input type="range" min="2000" max="7000" step="50" value={custoHa} onChange={(e) => setCustoHa(Number(e.target.value))} className="w-full accent-[#f85149]" />
            </div>
          </div>
          
          <button onClick={onClose} className="mt-8 w-full py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-md border border-[#363b42] transition-colors">
            Fechar Simulador
          </button>
        </div>

        {/* Painel Direito: Resultados da Análise */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#1c2128] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-gray-400 mb-1">Produtividade Estimada</div>
              <div className="text-2xl font-bold text-white">{sacasHa.toFixed(1)} <span className="text-sm font-normal text-gray-500">sc/ha</span></div>
            </div>
            <div className="bg-[#1c2128] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-gray-400 mb-1">Ponto de Equilíbrio</div>
              <div className="text-2xl font-bold text-white">{breakEven.toFixed(1)} <span className="text-sm font-normal text-gray-500">sc/ha</span></div>
            </div>
          </div>

          <div className="bg-[#1c2128] p-6 rounded-lg border border-[#30363d] mb-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: lucro >= 0 ? '#3fb950' : '#f85149' }}></div>
            <div className="text-sm text-gray-400 mb-1">Lucro Líquido Projetado (por hectare)</div>
            <div className={`text-4xl font-black ${lucro >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              {formatBRL(lucro)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${lucro >= 0 ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f85149]/20 text-[#f85149]'}`}>
                {margem.toFixed(1)}% Margem
              </span>
              <span className="text-xs text-gray-500">Receita Bruta: {formatBRL(receita)}</span>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[#30363d]">
            <h4 className="text-xs font-semibold text-gray-300 mb-1">Metodologia Científica</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Cálculo fundamentado em dados agronômicos consolidados. A produtividade é estimada através da equação: <br/>
              <code className="text-[#58a6ff] bg-[#0d1117] px-1 rounded">((Espigas/m² × 35 grãos) × PMG 40g) / 100</code>. <br/>
              O Ponto de Equilíbrio indica a quantidade mínima de sacas necessárias para cobrir o custo operacional.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}