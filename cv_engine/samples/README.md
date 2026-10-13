# Conjunto de Testes Oficial de Trigo — SugarVision (Sprint 6)

Este diretório contém o conjunto de testes oficial curado a partir do **Global Wheat Head Dataset 2021 (GWHD)** para servir de benchmark padrão do modelo de visão computacional.

## Resumo Estatístico
- **Total de Imagens:** 20
- **Total de Espigas de Trigo Anotadas:** 1560
- **Classe Única Validada:** `0: wheat`
- **Modelo Oficial de Produção:** `backend/best.pt` (YOLOv8x - 136 MB)
- **Licença do Dataset:** Creative Commons Attribution 4.0 International (CC BY 4.0)

## Estrutura de Diretórios
```
cv_engine/samples/
├── data.yaml                     # Configuração para ultralytics YOLO
├── curation_manifest.json        # Metadados e telemetria de cada amostra
├── README.md                     # Documentação oficial
└── wheat_test_set/
    ├── images/                   # 20 imagens fotométricas e fenológicas
    └── labels/                   # 20 anotações YOLO (.txt) normalizadas para classe 0
```

## Distribuição dos Clusters de Amostragem

1. **Alta Luminosidade & Sol Direto (5 amostras):** Domínios CIMMYT e Terraref. Condições de radiação solar direta, solo seco e alto contraste com sombras duras.
2. **Sombra & Luz Difusa (5 amostras):** Domínios UQ (University of Queensland). Dias nublados, luz difusa e sombra sob dossel foliar.
3. **Estágio Vegetativo Inicial / Espigas Verdes (5 amostras):** Domínios Ukyoto e ARC. Espigas jovens com matiz verde similar à folhagem, testando capacidade de discriminação morfológica.
4. **Maturação Avançada & Alta Densidade (5 amostras):** Domínios NAU e KSU. Espigas douradas e senescentes em fase pré-colheita com alta densidade e proximidade espacial.

## Referência Científica
David, E., Madec, S., Sadeghi-Tehran, P., et al. (2021). *Global Wheat Head Dataset 2021: more diversity to improve the average domain generalization*. Plant Phenomics.
