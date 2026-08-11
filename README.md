# PGP-SpotLight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()

> **Projeto Acadêmico - UFFS | Segurança Pública (Pessoas Desaparecidas)**

## Sobre o Projeto

Visando criar soluções para problemas de segurança pública idealizamos o SpotLight como uma ferramenta que auxilia autoridades competentes na busca por pessoas desaparecidas. 

Além da emissão de alertas geolocalizados, a plataforma utiliza inteligência espacial para traçar raios de alcance e projetar círculos sobre as últimas áreas onde a pessoa possivelmente esteve. Através da geração de mapas de calor e do traçado de rotas de deslocamento prováveis, o sistema oferece às autoridades uma visualização geográfica para direcionar as equipes de busca com maior precisão.

## Backlog e Funcionalidades Previstas

* **Gestão de Identidade:** Cadastro de usuários sejam cidadãos ou autoridades governamentais com validação para inibir informações falsas.
* **Mural de Alertas:** Exibição em tempo real de pessoas desaparecidas na região do usuário (ex: Chapecó e arredores).
* **Notificações Georreferenciadas:** Alertas disparados para celulares em um raio específico (ex: 10km) do último avistamento.
* **Reporte de Pistas:** Botão rápido para envio de fotos, localização ou descrições diretamente para os responsáveis.

## Product Backlog (Lista de Requisitos)

### Gestão de Identidade e Segurança
- **[US01]** Como usuário, quero me cadastrar usando meu CPF e e-mail para acessar a plataforma.
- **[US02]** Como sistema, quero validar a identidade de autoridades para liberar o perfil de "Gestor de Alertas".
- **[US03]** Como usuário, quero fazer login seguro e gerenciar minha senha.

### Gestão e Mural de Alertas
- **[US04]** Como autoridade, quero cadastrar um novo alerta de desaparecimento com foto, características físicas, roupas e local do último avistamento.
- **[US05]** Como usuário, quero visualizar um "Mural" com a lista de pessoas desaparecidas ativas na minha região (ex: Chapecó).
- **[US06]** Como autoridade, quero poder encerrar um alerta quando o caso for resolvido.

### Geolocalização e Inteligência Espacial
- **[US07]** Como sistema, quero capturar a localização atual (background) do usuário comum para saber se ele está em uma área de interesse.
- **[US08]** Como sistema, quero disparar uma notificação push para todos os celulares num raio de "X" km do último avistamento.
- **[US09]** Como autoridade, quero visualizar um mapa de calor e projeções de círculos geográficos baseados no tempo desde o desaparecimento.

### Interação e Reporte de Pistas
- **[US10]** Como usuário, quero um botão de "Reportar Pista" no alerta para enviar uma foto, minha localização atual e um texto descritivo.
- **[US11]** Como autoridade, quero receber e visualizar as pistas enviadas pelos cidadãos atreladas a um caso específico.

## Tecnologias 

*(A arquitetura será definida nas próximas Sprints)*

## Equipe

* **[Bernardo Flores Dalla Rosa]** - Desenvolvedor 
* **[Jonathan Götz Correa]** - Desenvolvedor
