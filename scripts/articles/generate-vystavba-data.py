#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["czso", "pandas"]
# ///

"""
Vygeneruje datové podklady pro článek o výstavbě bytů v ČR (ČSÚ).

Použití:
  uv run --no-project scripts/articles/generate-vystavba-data.py

Výstupy:
  ai/articles/vystavba/czso_stavebni_povoleni_bytove_nova_vystavba_cr_rocne.csv
  ai/articles/vystavba/czso_dokoncene_byty_cr_rocne_1997_2024.csv
  ai/articles/vystavba/czso_index_stavebni_produkce_rocni.csv
  ai/articles/vystavba/czso_vystavba_chart_data.json
  ai/articles/vystavba/czso_vystavba_key_points.md
"""

from __future__ import annotations

from pathlib import Path
import json
import pandas as pd
import czso

OUT_DIR = Path("ai/articles/vystavba")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def format_int_cs(value: int | float) -> str:
    """Formátuje celé číslo s českými oddělovači tisíců."""
    return format(int(value), ",").replace(",", " ")


def get_year_row(df: pd.DataFrame, year: int) -> pd.Series:
    """Bezpečně vrátí řádek pro daný rok nebo vyhodí srozumitelnou chybu."""
    rows = df.loc[df["year"] == year]
    if rows.empty:
        raise ValueError(f"V datech chybí rok {year}.")
    return rows.iloc[0]


def load_permits() -> pd.DataFrame:
    """ČSÚ 200077: povolení na bytové budovy, nová výstavba, ČR, ročně."""
    df = czso.get_table("200077")
    permits = df[
        (df["uzemi"] == "Česká republika")
        & (df["stapro"] == "Počet vydaných stavebních ohlášení a povolení")
        & (df["mj"] == "četnostní jednotka")
        & (df["typstavby"] == "Budovy bytové")
        & (df["smer"] == "nová výstavba")
        & (df["mesicod"] == 1)
        & (df["mesicdo"] == 12)
    ][["year", "value"]].copy()

    permits = permits.rename(columns={"value": "permits"}).sort_values("year")
    permits["permits"] = permits["permits"].astype(int)
    return permits


def load_completed() -> pd.DataFrame:
    """ČSÚ 200068: dokončené byty, součet přes obce, ročně."""
    raw = czso.get_table("200068", clean=False)
    completed = (
        raw[raw["tb_cis"].isna()]
        .groupby("rok", as_index=False)["hodnota"]
        .sum()
        .rename(columns={"rok": "year", "hodnota": "completed"})
        .sort_values("year")
    )
    completed["completed"] = completed["completed"].astype(int)
    return completed


def load_construction_production_index() -> pd.DataFrame:
    """ČSÚ 200075: roční průměr indexu stavební produkce (stálé ceny, neočištěno, průměr bazického roku)."""
    df = czso.get_table("200075")
    selected = df[
        (df["oceneni"] == "stálé (průměrné) ceny roku")
        & (df["ocisteni"] == "neočištěno")
        & (df["casz"] == "průměr bazického roku")
        & (df["stavprace"].isin(["Stavební práce celkem", "Pozemní stavitelství", "Inženýrské stavitelství"]))
    ]

    annual = (
        selected.groupby(["year", "stavprace"], as_index=False)["value"]
        .mean()
        .pivot(index="year", columns="stavprace", values="value")
        .rename(
            columns={
                "Stavební práce celkem": "index_total",
                "Pozemní stavitelství": "index_buildings",
                "Inženýrské stavitelství": "index_engineering",
            }
        )
        .reset_index()
        .sort_values("year")
    )

    for col in ["index_total", "index_buildings", "index_engineering"]:
        annual[col] = annual[col].round(1)

    return annual


def build_chart_data(permits: pd.DataFrame, completed: pd.DataFrame) -> pd.DataFrame:
    first_year = int(min(permits["year"].min(), completed["year"].min()))
    last_year = int(max(permits["year"].max(), completed["year"].max()))

    years = pd.DataFrame({"year": list(range(first_year, last_year + 1))})
    df = years.merge(permits, on="year", how="left").merge(completed, on="year", how="left")

    df["permits_yoy"] = (df["permits"].pct_change() * 100).round(1)
    df["completed_yoy"] = (df["completed"].pct_change() * 100).round(1)

    overlap_years = df.loc[df["permits"].notna() & df["completed"].notna(), "year"]
    if overlap_years.empty:
        raise ValueError("Chybí překryv mezi řadami povolení a dokončených bytů.")

    base_year = 2019 if 2019 in set(overlap_years.tolist()) else int(overlap_years.max())
    base_row = get_year_row(df, base_year)

    permits_base = float(base_row["permits"])
    completed_base = float(base_row["completed"])

    df["permits_idx_2019"] = (df["permits"] / permits_base * 100).round(1)
    df["completed_idx_2019"] = (df["completed"] / completed_base * 100).round(1)

    return df


def write_outputs(
    permits: pd.DataFrame,
    completed: pd.DataFrame,
    production_index: pd.DataFrame,
    chart: pd.DataFrame,
) -> None:
    permits.to_csv(OUT_DIR / "czso_stavebni_povoleni_bytove_nova_vystavba_cr_rocne.csv", index=False)
    completed.to_csv(OUT_DIR / "czso_dokoncene_byty_cr_rocne_1997_2024.csv", index=False)
    production_index.to_csv(OUT_DIR / "czso_index_stavebni_produkce_rocni.csv", index=False)

    records = []
    for _, row in chart.iterrows():
        rec: dict[str, int | float | None] = {"year": int(row["year"])}
        for col in ["permits", "completed"]:
            rec[col] = None if pd.isna(row[col]) else int(row[col])
        for col in ["permits_yoy", "completed_yoy", "permits_idx_2019", "completed_idx_2019"]:
            rec[col] = None if pd.isna(row[col]) else float(row[col])
        records.append(rec)

    with (OUT_DIR / "czso_vystavba_chart_data.json").open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    row_2021 = get_year_row(chart, 2021)
    row_2025 = get_year_row(chart, 2025)
    row_2024 = get_year_row(chart, 2024)

    completed_max = chart.loc[chart["completed"].idxmax()]
    production_max = production_index.loc[production_index["index_total"].idxmax()]

    with (OUT_DIR / "czso_vystavba_key_points.md").open("w", encoding="utf-8") as f:
        f.write("# Key points pro článek\n\n")
        f.write(
            "- Povolení (bytové budovy, nová výstavba) 2021→2025: "
            f"{format_int_cs(row_2021['permits'])} → {format_int_cs(row_2025['permits'])} "
            f"({(row_2025['permits'] / row_2021['permits'] - 1) * 100:.1f} %).\n"
        )
        f.write(
            "- Dokončené byty: "
            f"rekord {format_int_cs(completed_max['completed'])} v {int(completed_max['year'])}.\n"
        )
        f.write(
            "- Dokončené byty 2024: "
            f"{format_int_cs(row_2024['completed'])} ({row_2024['completed_yoy']:.1f} % YoY).\n"
        )
        f.write(
            "- Index stavební produkce (stavební práce celkem) má v dostupné řadě maximum "
            f"{production_max['index_total']:.1f} v roce {int(production_max['year'])}.\n"
        )


if __name__ == "__main__":
    permits_df = load_permits()
    completed_df = load_completed()
    production_index_df = load_construction_production_index()
    chart_df = build_chart_data(permits_df, completed_df)
    write_outputs(permits_df, completed_df, production_index_df, chart_df)

    print("Hotovo. Výstupy jsou v:", OUT_DIR)
    print("-", OUT_DIR / "czso_stavebni_povoleni_bytove_nova_vystavba_cr_rocne.csv")
    print("-", OUT_DIR / "czso_dokoncene_byty_cr_rocne_1997_2024.csv")
    print("-", OUT_DIR / "czso_index_stavebni_produkce_rocni.csv")
    print("-", OUT_DIR / "czso_vystavba_chart_data.json")
    print("-", OUT_DIR / "czso_vystavba_key_points.md")
