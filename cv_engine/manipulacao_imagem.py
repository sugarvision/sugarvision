from pathlib import Path
import cv2

def processar_imagem_cana(nome_arquivo: str):
    # 1. Localiza a imagem na mesma pasta do script
    diretorio_atual = Path(__file__).parent
    caminho_imagem = diretorio_atual / nome_arquivo

    # 2. Carrega a imagem do disco
    imagem_original = cv2.imread(str(caminho_imagem))

    # Validação: verifica se o arquivo realmente existe e pôde ser lido
    if imagem_original is None:
        print(f"Erro: Não foi possível encontrar ou carregar o arquivo '{nome_arquivo}'.")
        print(f"Caminho verificado: {caminho_imagem.resolve()}")
        return

    # Exibe as dimensões originais (Altura x Largura x Canais de cor)
    altura_orig, largura_orig, _ = imagem_original.shape
    print(f"Imagem original carregada: {largura_orig}x{altura_orig} pixels")

    # 3. Redimensiona a imagem para 640x640 pixels (padrão para YOLO e redes de IA)
    tamanho_alvo = (640, 640)
    imagem_redimensionada = cv2.resize(imagem_original, tamanho_alvo, interpolation=cv2.INTER_LINEAR)
    print("Imagem redimensionada com sucesso para: 640x640 pixels")

    # 4. Exibe a imagem em uma janela
    cv2.imshow("Cana-de-Acucar - 640x640 (Padrao IA)", imagem_redimensionada)

    print("\nPressione qualquer tecla na janela da imagem para fechar...")
    # Aguarda o usuário pressionar qualquer tecla
    cv2.waitKey(0)
    # Fecha todas as janelas abertas pelo OpenCV
    cv2.destroyAllWindows()


if __name__ == "__main__":
    # Substitua pelo nome exato da foto de cana que você tem na pasta
    NOME_DA_FOTO = "cana_teste.jpg" 
    
    processar_imagem_cana(NOME_DA_FOTO)