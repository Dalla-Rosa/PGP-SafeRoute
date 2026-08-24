# PGP-SafeRoute

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()

> **Planejamento e Gestão de Projetos - UFFS | Segurança Pública (Prevenção de acidentes em Rodovias Federais)**

## Sobre o Projeto

O SafeRoute é uma ferramenta de conscientização voltada para motoristas que percorrem rodovias federais. O sistema utiliza dados históricos de acidentes disponibilizados pela Polícia Rodoviária Federal (PRF) e técnicas de Machine Learning para identificar e classificar trechos de maior risco.

Ao informar uma rota, o usuário poderá visualizar os trechos da rodovia classificados de acordo com o nível de risco estimado. O mapa utilizará diferentes cores para destacar as áreas que demandam maior atenção. Além disso, ao selecionar um trecho específico, o sistema apresentará informações relevantes sobre os acidentes registrados na região, como quantidade de ocorrências, gravidade, principais causas, condições meteorológicas e períodos de maior ocorrência.

O objetivo não é prever acidentes de forma absoluta, mas fornecer informações que auxiliem na conscientização dos motoristas e na adoção de uma condução mais cautelosa em trechos historicamente mais críticos.

## Equipe

* **[Bernardo Flores Dalla Rosa]** - Desenvolvedor 
* **[Jonathan Götz Correa]** - Desenvolvedor

# Sprint 0

## Canvas 

| Bloco | Descrição |
| :--- | :--- |
| **Problema** | Motoristas que percorrem rodovias federais nem sempre possuem informações sobre quais trechos apresentam maior histórico de acidentes e quais fatores estão associados a essas ocorrências. Isso dificulta a identificação de regiões que demandam maior atenção durante uma viagem. |
| **Proposta de Valor** | Desenvolver uma ferramenta de conscientização que utiliza dados históricos de acidentes da PRF e Machine Learning para classificar trechos de rodovias de acordo com seu nível de risco estimado, permitindo que motoristas visualizem essas informações diretamente em sua rota. |
| **Público-Alvo** | Motoristas e viajantes que utilizam rodovias federais e desejam obter informações sobre as condições e o histórico de acidentes dos trechos presentes em sua rota. |
| **Entregas** | Sistema para informar origem e destino de uma rota.<br>Integração com dados públicos de acidentes da PRF.<br>Processamento e preparação dos dados para utilização no modelo de Machine Learning.<br>Modelo para classificação do nível de risco dos trechos.<br>Mapa com representação visual dos níveis de risco.<br>Interface com informações detalhadas sobre acidentes ao selecionar um trecho específico. |
| **Premissas e Restrições** | Os dados públicos da PRF precisam estar disponíveis e possuir informações suficientes para a análise.<br>O sistema depende de dados geográficos para identificar os trechos das rodovias presentes na rota.<br>O nível de risco apresentado será baseado em dados históricos e no modelo desenvolvido, não representando uma previsão absoluta de acidentes.<br>**Restrição:** A ferramenta possui caráter informativo e de conscientização, não substituindo orientações ou informações oficiais dos órgãos de trânsito. |
| **Riscos** | Dados da PRF podem apresentar inconsistências, informações ausentes ou alterações em sua estrutura.<br>O modelo de Machine Learning pode apresentar baixa precisão ou dificuldade de generalização para determinados trechos.<br>Dificuldades na associação entre os dados dos acidentes e os trechos geográficos das rodovias.<br>Interpretação incorreta do nível de risco apresentado pelo usuário.<br>Limitações na disponibilidade ou atualização dos dados utilizados pelo sistema. |
| **Equipe** | Bernardo Flores Dalla Rosa (Desenvolvedor) e Jonathan Götz Correa (Desenvolvedor). |

## Kanban e Backlog

Constam na aba Projects do repositório: https://github.com/users/Dalla-Rosa/projects/1, Backlogs já estão inseridos dentro do Kanban.

## Artigo
Overleaf: https://www.overleaf.com/project/6a7b5f0b6dbb7bc869c75906

# Sprint 1

## Database 
https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf

## Notebook
https://colab.research.google.com/drive/1WwlQfI0iXWQVytxACnqdf2SUvmlSmN63?usp=sharing
