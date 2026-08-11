# PGP-SpotLight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)]()

> **Planejamento e Gestão de Projetos - UFFS | Segurança Pública (Pessoas Desaparecidas)**

## Sobre o Projeto

Visando criar soluções para problemas de segurança pública idealizamos o SpotLight como uma ferramenta que auxilia autoridades competentes na busca por pessoas desaparecidas. 

A ferramenta utiliza dados públicos da polícia para mapear desaparecimentos recentes. Com base no local onde a pessoa sumiu, o sistema desenha círculos de busca no mapa e emite alertas diretamente para os celulares de quem está naquela região. Isso ajuda a criar uma rede de apoio local rápida e orienta as autoridades sobre onde focar as buscas.

### O Problema
Apesar da existência de bases de dados abertas sobre segurança pública, a análise geoespacial de pessoas desaparecidas ainda é um desafio no cenário brasileiro. Os dados, quando abertos, são frequentemente disponibilizados em formatos tabulares extensos, o que dificulta a percepção rápida de padrões geográficos, concentrações de casos e correlações espaciais pelas autoridades competentes e pela própria sociedade civil.

O problema central que este projeto busca solucionar é a dificuldade de visualização, cruzamento e interpretação de dados contextuais sobre desaparecimentos em regiões específicas. Sem uma ferramenta visual adequada que consolide o local do desaparecimento com detalhes cruciais — como as características físicas da vítima, roupas usadas no momento do desaparecimento e horário da ocorrência —, o processo de investigação e as campanhas de busca tornam-se menos eficientes.

### Objetivos Principais
* Coletar, estruturar e realizar a limpeza (data cleaning) de datasets públicos governamentais referentes a pessoas desaparecidas;
* Desenvolver um mapa de calor (heatmap) que evidencie as áreas e regiões com maior incidência de desaparecimentos;
* Implementar um sistema de anotações geolocalizadas, permitindo a visualização de detalhes contextuais (ex: vestimentas, horário, idade, características físicas) diretamente na interface do mapa;
* Projetar uma ferramenta acessível e intuitiva que possa auxiliar tanto autoridades policiais quanto organizações não governamentais (ONGs) na identificação de padrões espaço-temporais.

## Product Backlog
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

## Canvas 

| Bloco | Descrição |
| :--- | :--- |
| **Problema** | As primeiras 48 horas de um desaparecimento são decisivas. Atualmente, os alertas ficam espalhados em redes sociais genéricas e quase nunca chegam rápido para as pessoas que estão fisicamente perto de onde o desaparecimento ocorreu. |
| **Proposta de Valor** | Uma ferramenta que auxilia autoridades na busca por pessoas desaparecidas. O sistema usa dados públicos da polícia para traçar áreas de busca no mapa e envia alertas diretamente para os celulares de quem está na região. |
| **Público-Alvo** | Autoridades de Segurança Pública e ONGs (que precisam direcionar as buscas).<br> Cidadãos da região (que recebem os alertas e formam a rede de apoio). |
| **Entregas** | Integração com os dados públicos da polícia.<br> Mapa com círculos demarcando o raio de busca a partir do último local conhecido.<br> Disparo de notificações para usuários dentro desse raio.<br> Botão rápido para cidadãos enviarem pistas (foto e local) para a polícia. |
| **Premissas e Restrições** | Os dados da polícia precisam estar acessíveis; O usuário precisa estar com o GPS do celular ativo.<br>**Restrições:** A ferramenta é um apoio, não substitui a investigação oficial; Deve respeitar a privacidade (LGPD). |
| **Riscos** | Baixa adesão inicial da população da cidade ao aplicativo.<br>Lentidão ou falha na atualização dos dados públicos por parte da polícia.<br> Envio de pistas falsas por usuários mal-intencionados. |
| **Equipe** | Bernardo Flores Dalla Rosa (Desenvolvedor) e Jonathan Götz Correa (Desenvolvedor). |

## Tecnologias 

*(A arquitetura será definida nas próximas Sprints)*

## Equipe

* **[Bernardo Flores Dalla Rosa]** - Desenvolvedor 
* **[Jonathan Götz Correa]** - Desenvolvedor
