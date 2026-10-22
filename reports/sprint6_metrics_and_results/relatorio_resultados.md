# Relatório de Validação e Métricas de IA - My Agro

Abaixo encontra-se o detalhamento técnico e os valores correspondentes extraídos dos resultados de validação do modelo YOLO:

## 1. Previsões e Rótulos dos Lotes
* **`val_batch1_pred.jpg`**: Ilustra o desempenho prático de inferência do modelo no lote 1, exibindo as caixas delimitadoras (*bounding boxes*) com a classe `wheat` e os respetivos scores de confiança (tipicamente entre 0.3 e 0.8)[cite: 7].
* **`val_batch1_labels.jpg`**: Apresenta as anotações reais de referência (*ground truth*) em formato de caixas azuis para todas as espigas presentes no lote 1[cite: 8].
* **`val_batch0_pred.jpg`**: Demonstra o resultado inferido pelo algoritmo de visão computacional nas imagens do lote 0, permitindo auditar a densidade de deteção e eventuais falsos positivos[cite: 9].
* **`val_batch0_labels.jpg`**: Contém o padrão-ouro de referência manual original das espigas no lote 0, servindo de base para aferir a exatidão espacial[cite: 10].

## 2. Matrizes de Confusão
* **`confusion_matrix_normalized.png` (Matriz Normalizada)**[cite: 11]:
  * Taxa de acerto para `wheat` (Verdadeiro Positivo / Real): **0.83** (83%)[cite: 11]
  * Taxa de omissão / falsos negativos (Fundo / Real `wheat`): **0.17** (17%)[cite: 11]
* **`confusion_matrix.png` (Matriz Absoluta)**[cite: 12]:
  * Verdadeiros Positivos (`wheat` predito correto): **1297**[cite: 12]
  * Falsos Negativos (`wheat` não detetado): **263**[cite: 12]
  * Instâncias de fundo (*background*): **4703**[cite: 12]

## 3. Curvas de Desempenho e Métricas
* **`BoxR_curve.png` (Curva Recall-Confiança)**[cite: 13]:
  * **Recall máximo**: **0.79** (79%) obtido no limiar de confiança de **0.000** (`all classes 0.79 at 0.000`). Mostra que o modelo consegue recuperar até 79% das instâncias reais ao aceitar menor confiança[cite: 13].
* **`BoxPR_curve.png` (Curva Precisão-Recall)**[cite: 14]:
  * **mAP@0.5 global**: **0.658** (65.8%) (`all classes 0.658 mAP@0.5`). Sintetiza a eficácia global do detetor de objetos através da área sob a curva Precision-Recall[cite: 14].
* **`BoxP_curve.png` (Curva Precisão-Confiança)**[cite: 15]:
  * **Precisão máxima**: **1.00** (100%) alcançada com um limiar de confiança de **0.809** (`all classes 1.00 at 0.809`). Garante que as predições feitas com esta alta certeza são inteiramente precisas[cite: 15].
* **`BoxF1_curve.png` (Curva F1-Score-Confiança)**[cite: 16]:
  * **F1-Score máximo**: **0.68** atingido no limiar de confiança ótimo de **0.289** (`all classes 0.68 at 0.289`). Representa o melhor equilíbrio operacional entre a Precisão e o Recall[cite: 16].