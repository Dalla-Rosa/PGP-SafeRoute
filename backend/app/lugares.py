"""Busca de lugares para o autocomplete de origem e destino.

Usa o Photon (OpenStreetMap), que é feito para busca incremental — o Nominatim
desencoraja esse uso. Como o resultado já traz coordenada, o formulário não
precisa geocodificar de novo no envio.
"""

from __future__ import annotations

import time
import unicodedata

URL_PHOTON = "https://photon.komoot.io/api/"
CAIXA_BRASIL = "-74,-34,-34,6"  # minLon,minLat,maxLon,maxLat
VALIDADE_CACHE_S = 900
MAX_CACHE = 500

# Quanto mais alto, mais acima na lista. Quem planeja viagem procura cidade,
# não bairro nem estabelecimento.
PESO_DO_TIPO = {
    "city": 0,
    "municipality": 0,
    "town": 1,
    "village": 2,
    "borough": 3,
    "suburb": 4,
    "district": 4,
    "hamlet": 5,
    "locality": 6,
}
PESO_FORA_DE_PLACE = 9


def _sem_acento(texto: str) -> str:
    sem = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in sem if not unicodedata.combining(c)).casefold().strip()


SIGLA_DA_UF = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA",
    "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO",
    "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
    "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ",
    "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO",
    "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP", "Sergipe": "SE",
    "Tocantins": "TO",
}


def _descrever(p: dict) -> str:
    """Desambiguação no formato usual: "SC" ou "São Desidério, BA"."""
    estado = p.get("state") or ""
    uf = SIGLA_DA_UF.get(estado, estado)
    municipio = p.get("city")
    if municipio and municipio != p.get("name"):
        return f"{municipio}, {uf}" if uf else municipio
    return uf


def _proximidade(nome: str, alvo: str) -> int:
    """0 = começa com o digitado, 1 = contém, 2 = não casa pelo nome."""
    if nome.startswith(alvo):
        return 0
    return 1 if alvo in nome else 2


def _ordenar(feicoes: list[dict], consulta: str) -> list[dict]:
    alvo = _sem_acento(consulta)

    def chave(f):
        p = f.get("properties", {})
        nome = _sem_acento(p.get("name") or "")
        tipo = PESO_DO_TIPO.get(p.get("osm_value"), PESO_FORA_DE_PLACE)
        if p.get("osm_key") != "place":
            tipo = PESO_FORA_DE_PLACE
        return (_proximidade(nome, alvo), tipo, len(nome))

    return sorted(feicoes, key=chave)


class BuscaDeLugares:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, list[dict]]] = {}

    def _do_cache(self, chave: str) -> list[dict] | None:
        guardado = self._cache.get(chave)
        if guardado and guardado[0] > time.time():
            return guardado[1]
        return None

    def _guardar(self, chave: str, valor: list[dict]) -> None:
        if len(self._cache) >= MAX_CACHE:
            mais_antiga = min(self._cache, key=lambda k: self._cache[k][0])
            del self._cache[mais_antiga]
        self._cache[chave] = (time.time() + VALIDADE_CACHE_S, valor)

    async def buscar(self, cliente, consulta: str, limite: int = 6) -> list[dict]:
        chave = _sem_acento(consulta)
        if len(chave) < 2:
            return []
        if (guardado := self._do_cache(chave)) is not None:
            return guardado[:limite]

        try:
            resposta = await cliente.get(
                URL_PHOTON,
                params={"q": consulta, "limit": 20, "bbox": CAIXA_BRASIL},
                timeout=6.0,
            )
            resposta.raise_for_status()
            feicoes = resposta.json().get("features", [])
        except Exception:
            # Autocomplete é conveniência: falha dele não pode quebrar a tela.
            return []

        alvo = _sem_acento(consulta)
        vistos: set[tuple] = set()
        lugares, reservas = [], []
        for f in _ordenar(feicoes, consulta):
            p = f.get("properties", {})
            coord = f.get("geometry", {}).get("coordinates")
            if p.get("countrycode") != "BR" or not p.get("name") or not coord:
                continue
            # Não se traça rota para um estado inteiro, e o nome dele duplicaria
            # a capital homônima na lista.
            if p.get("osm_value") in ("state", "country"):
                continue
            # O Photon também casa pelo estado: "sao paul" traria Agudos/SP.
            if _proximidade(_sem_acento(p["name"]), alvo) == 2:
                continue
            identidade = (_sem_acento(p["name"]), p.get("state"), p.get("city"))
            if identidade in vistos:
                continue
            vistos.add(identidade)
            achado = {
                "nome": p["name"],
                "descricao": _descrever(p),
                "lat": round(float(coord[1]), 6),
                "lon": round(float(coord[0]), 6),
            }
            # Quem traça uma viagem busca cidade; loja e ponto de interesse só
            # aparecem se não houver lugares suficientes.
            (lugares if p.get("osm_key") == "place" else reservas).append(achado)

        resultado = (lugares or reservas)[:limite]
        self._guardar(chave, resultado)
        return resultado
