# Classificação de manguezais por imagens ópticas e interferométricas sentinel na região estuarina de Cananéia-Iguape (SP)

## Filtragem e normalização de índices Espctrais em coleções de imagens

O script mangrove_sar_and_optical_images utiliza uma coleção de imagens ópticas harmonizadas e interferométricas com polarização VV.

Tanto a coleção de imagens sentinel 1 (SAR) e sentinel 2 (optical) tiveram filtros aplicados no período de um ano (de 01/01/2022 a 30/12/2022).

Aplicou-se a filtragem de média na coleção das imagens de radar e mediana na coleção de imagens passivas sobre a área de estudo.

Índices normalizados foram gerados para cada stack de bandas como o NDVI (Índice de Vegetação), NDBI (Índice de Área Construída), MNDWI (Índice de Umidade).

## Amostragens

Amostras de validação e treinamento foram geradas para as classes de mangue e não mangue com um total de 100 pontos para cada objeto de interesse.

Estas amostras foram separadas para pontos de controle de validação e treinamento de máquina. A classificação Random Forest foi aplicada para o treinamento e processamento dos dados. 

## Resultados

Como resultados tivemos:

1. A classificação de manguezais no ano de 2022 por imagens ópticas e interferométricas;

2. Imagem RGB da área de estudo;

3. Imagem pré-processada interferométrica de radar na polarização VV (Sentinel 1);

4. Índices de vegetação, umidade e área construída.

## Imagens processadas

![image info](https://github.com/gmsmoreno/gee/blob/main/imagens.gif)