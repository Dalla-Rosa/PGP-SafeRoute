# PGP-SpotLight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()

> **Planejamento e Gestão de Projetos - UFFS | Segurança Pública (Pessoas Desaparecidas)**

## Sobre o Projeto

Visando criar soluções para problemas de segurança pública idealizamos o SpotLight como uma ferramenta que auxilia autoridades competentes na busca por pessoas desaparecidas. 

A ferramenta utiliza dados públicos da polícia para mapear desaparecimentos recentes. Com base no local onde a pessoa sumiu, o sistema desenha círculos de busca no mapa e emite alertas diretamente para os celulares de quem está naquela região. Isso ajuda a criar uma rede de apoio local rápida e orienta as autoridades sobre onde focar as buscas.

## Equipe

* **[Bernardo Flores Dalla Rosa]** - Desenvolvedor 
* **[Jonathan Götz Correa]** - Desenvolvedor

# Sprint 0

## Canvas 

| Bloco | Descrição |
| :--- | :--- |
| **Problema** | As primeiras 48 horas de um desaparecimento são decisivas. Atualmente, os alertas ficam espalhados em redes sociais genéricas e quase nunca chegam rápido para as pessoas que estão fisicamente perto de onde o desaparecimento ocorreu. |
| **Proposta de Valor** | Uma ferramenta que auxilia autoridades na busca por pessoas desaparecidas. O sistema usa dados públicos da polícia para traçar áreas de busca no mapa e envia alertas diretamente para os celulares de quem está na região. |
| **Público-Alvo** | Autoridades de Segurança Pública e ONGs (que precisam direcionar as buscas).<br> Cidadãos da região (que recebem os alertas e formam a rede de apoio). |
| **Entregas** | Integração com os dados públicos da polícia.<br> Mapa com círculos demarcando o raio de busca a partir do último local conhecido.<br> Disparo de notificações para usuários dentro desse raio. |
| **Premissas e Restrições** | Os dados da polícia precisam estar acessíveis; O usuário precisa estar com o GPS do celular ativo.<br>**Restrições:** A ferramenta é um apoio, não substitui a investigação oficial |
| **Riscos** | Baixa adesão inicial da população da cidade ao aplicativo.<br>Lentidão ou falha na atualização dos dados públicos por parte da polícia.<br> Envio de pistas falsas por usuários mal-intencionados. |
| **Equipe** | Bernardo Flores Dalla Rosa (Desenvolvedor) e Jonathan Götz Correa (Desenvolvedor). |

## Kanban e Backlog

Constam na aba Projects do repositório: https://github.com/users/Dalla-Rosa/projects/1, Backlogs já estão inseridos dentro do Kanban.

## Artigo
[PGP_SpotLight_Sprint_0.pdf](https://github.com/user-attachments/files/30951016/PGP_SpotLight_Sprint_0.pdf)

Overleaf: https://www.overleaf.com/project/6a7b5f0b6dbb7bc869c75906

# Sprint 1

## Database 
https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf

## Notebook
https://colab.research.google.com/drive/1WwlQfI0iXWQVytxACnqdf2SUvmlSmN63?usp=sharing
