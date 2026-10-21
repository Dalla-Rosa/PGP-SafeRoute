"""Carrega o pacote exportado pelo notebook e avalia o risco dos trechos.

Nada aqui recalcula features ou limiares: cortes de nível, mapa WMO e regras de
clima vêm do joblib, porque mudam a cada retreino.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

PASTA_PADRAO = Path(__file__).resolve().parent.parent / "modelo"

TEXTO_SENSIVEL = "Trecho historicamente perigoso com {clima} ({indice:.1f}× a média da rodovia)"
TEXTO_INFORMATIVO = "{clima} prevista neste trecho"


class ModeloRisco:
    def __init__(self, pasta: Path = PASTA_PADRAO) -> None:
        pacote = joblib.load(pasta / "saferoute_modelo.joblib")
        self._pipeline = pacote["modelo"]
        self._features = pacote["features_categoricas"] + pacote["features_numericas"]
        self.cortes = pacote["cortes_nivel_risco"]
        self.niveis = list(pacote["niveis"])
        self.mapa_wmo_para_clima = pacote["mapa_wmo_para_clima"]
        self.regras_clima = pacote["regras_clima"]
        self.tamanho_segmento_km = pacote["tamanho_segmento_km"]
        self.metricas = pacote["metricas_teste_2025"]
        self.anos_treino = pacote["anos_treino"]
        self.trechos = pd.read_csv(pasta / "saferoute_trechos.csv", index_col=0)

    def _entrada(self, t: pd.DataFrame, horas, dias_semana, fases, climas) -> pd.DataFrame:
        horas = np.asarray(horas, dtype=float)
        return pd.DataFrame(
            {
                "fase_dia": fases,
                "clima_grupo": climas,
                "tipo_pista": t["tipo_pista"].to_numpy(),
                "tracado_via": t["tracado_via"].to_numpy(),
                "uso_solo": t["uso_solo"].to_numpy(),
                "uf": t["uf"].to_numpy(),
                "hora_sin": np.sin(2 * np.pi * horas / 24),
                "hora_cos": np.cos(2 * np.pi * horas / 24),
                "dia_semana_num": dias_semana,
                "latitude": t["latitude"].to_numpy(),
                "longitude": t["longitude"].to_numpy(),
                "acidentes_ano_segmento": t["acidentes_ano_segmento"].to_numpy(),
                "taxa_fatalidade_segmento": t["taxa_fatalidade_segmento"].to_numpy(),
                "risco_relativo_na_br": t["risco_relativo_na_br"].to_numpy(),
            },
            index=t.index,
        )[self._features]

    def _scores(self, t, horas, dias_semana, fases, climas) -> np.ndarray:
        entrada = self._entrada(t, horas, dias_semana, fases, climas)
        return self._pipeline.predict_proba(entrada)[:, 1]

    def indice_do_nivel(self, scores: np.ndarray) -> np.ndarray:
        indices = np.zeros(len(scores), dtype=int)
        indices[scores >= self.cortes["medio"]] = 1
        indices[scores >= self.cortes["alto"]] = 2
        indices[scores >= self.cortes["critico"]] = 3
        return indices

    def nivel(self, score: float) -> str:
        return self.niveis[int(self.indice_do_nivel(np.array([score]))[0])]

    def avaliar(self, t: pd.DataFrame, horas, dias_semana, fases, climas) -> list[dict]:
        """Score, nível e alertas de cada trecho, na mesma ordem de `t`.

        Aplica as regras de clima da seção 7 do Contexto.md.
        """
        if len(t) == 0:
            return []

        climas = list(climas)
        so_claro = ["claro"] * len(t)
        p_clima = self._scores(t, horas, dias_semana, fases, climas)
        # Regra 1: o clima nunca reduz o risco. No histórico a chuva tem letalidade
        # menor que céu claro, e exibir "está chovendo, seu risco caiu" seria perigoso.
        p_claro = p_clima if climas == so_claro else self._scores(t, horas, dias_semana, fases, so_claro)
        scores = np.maximum(p_clima, p_claro)
        indices = self.indice_do_nivel(scores)

        resultados = []
        ultimo_nivel = len(self.niveis) - 1
        for i, (segmento_id, linha) in enumerate(t.iterrows()):
            indice, alertas, clima = int(indices[i]), [], climas[i]
            if clima in ("chuva", "neblina"):
                sensivel = bool(linha[f"sensivel_{clima}"])
                if sensivel:
                    # Regra 2: trecho sensível à condição prevista sobe um nível.
                    indice = min(indice + self.regras_clima["sobe_niveis_se_sensivel"], ultimo_nivel)
                    texto = TEXTO_SENSIVEL.format(clima=clima, indice=linha[f"indice_{clima}"])
                else:
                    # Regra 3: alerta informativo, sem mexer no nível.
                    texto = TEXTO_INFORMATIVO.format(clima=clima.capitalize())
                alertas.append({"tipo": clima, "sensivel": sensivel, "texto": texto})
            resultados.append(
                {
                    "segmento_id": segmento_id,
                    "score_risco": float(scores[i]),
                    "nivel_risco": self.niveis[indice],
                    "alertas": alertas,
                }
            )
        return resultados
