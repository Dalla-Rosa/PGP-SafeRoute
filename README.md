# PGP-SpotLight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()

> **Projeto Acadêmico - UFFS | Segurança Pública (Pessoas Desaparecidas)**

## Sobre o Projeto

Visando criar soluções para problemas de segurança pública idealizamos o SpotLight como uma ferramenta que auxilia autoridades competentes na busca por pessoas desaparecidas. 

A ferramenta utiliza dados públicos da polícia para mapear desaparecimentos recentes. Com base no local onde a pessoa sumiu, o sistema desenha círculos de busca no mapa e emite alertas diretamente para os celulares de quem está naquela região. Isso ajuda a criar uma rede de apoio local rápida e orienta as autoridades sobre onde focar as buscas.

## Backlog e Funcionalidades Previstas

* **Gestão de Identidade:** Cadastro de usuários sejam cidadãos ou autoridades governamentais.
* **Mural de Alertas:** Exibição em tempo real de pessoas desaparecidas na região do usuário (ex: Chapecó e arredores).
* **Notificações Georreferenciadas:** Alertas disparados para celulares em um raio específico (ex: 10km) do último avistamento.
* **Reporte de Pistas:** Botão rápido para envio de fotos, localização ou descrições diretamente para os responsáveis.

## Product Backlog (Lista de Requisitos)

### Gestão de Identidade e Segurança
- **[US01]** Como usuário, quero me cadastrar usando meu CPF e e-mail para acessar a plataforma.
- **[US02]** Como sistema, quero validar a identidade de autoridades para liberar o perfil de "Gestor de Alertas".
- **[US03]** Como usuário, quero fazer login seguro e gerenciar minha senha.
- **[US04]** Como autoridade, quero cadastrar um novo alerta de desaparecimento com foto, características físicas, roupas e local do último avistamento.
- **[US05]** Como usuário, quero visualizar um "Mural" com a lista de pessoas desaparecidas ativas na minha região (ex: Chapecó).
- **[US06]** Como autoridade, quero poder encerrar um alerta quando o caso for resolvido.
- **[US07]** Como sistema, quero capturar a localização atual (background) do usuário comum para saber se ele está em uma área de interesse.
- **[US08]** Como sistema, quero disparar uma notificação push para todos os celulares num raio de "X" km do último avistamento.
- **[US09]** Como autoridade, quero visualizar um mapa de calor e projeções de círculos geográficos baseados no tempo desde o desaparecimento.
- **[US10]** Como usuário, quero um botão de "Reportar Pista" no alerta para enviar uma foto, minha localização atual e um texto descritivo.
- **[US11]** Como autoridade, quero receber e visualizar as pistas enviadas pelos cidadãos atreladas a um caso específico.

## Tecnologias 

*(A arquitetura será definida nas próximas Sprints)*

## Equipe

* **[Bernardo Flores Dalla Rosa]** - Desenvolvedor 
* **[Jonathan Götz Correa]** - Desenvolvedor
