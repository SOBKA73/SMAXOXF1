"""Modèle financier recalibré pour une activité Starlink / Hotspot à N'Djamena.

Le modèle est illustratif : les paramètres commerciaux et réglementaires doivent être
confirmés par devis, contrats et autorisations locales avant toute offre RWA.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


CONFIG = {
    # Tokenisation
    "capital_initial_xaf": 10_000_000,
    "nombre_tokens": 20_000,
    "valeur_nominale_token_xaf": 500,
    # Allocation initiale du capital
    "nombre_kits_achetes": 15,
    "cout_kit_xaf": 400_000,
    "securisation_electrique_xaf": 1_500_000,
    "conformite_legale_initiale_xaf": 500_000,
    "fonds_roulement_initial_xaf": 2_000_000,
    # Vente / installation des kits : 20 % de marge brute sur le prix de vente
    "kits_vendus_par_mois": [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 2],
    "marge_brute_kits_pct": 0.20,
    # Hotspots : hypothèse explicite de demande pour convertir les micro-tickets en CA
    "nombre_hotspots": 5,
    "jours_exploitation_mois": 26,
    "tickets_par_hotspot_par_jour": 20,
    "prix_micro_ticket_xaf": 500,
    # OPEX et fiscalité
    "abonnement_starlink_par_hotspot_xaf": 32_000,
    "maintenance_par_hotspot_mois_xaf": 15_000,
    "taux_impot_resultat_exploitation": 0.25,
    "mois_simulation": 12,
}


def capital_allocation(config: dict = CONFIG) -> dict:
    kit_capex = config["nombre_kits_achetes"] * config["cout_kit_xaf"]
    total = (
        kit_capex
        + config["securisation_electrique_xaf"]
        + config["conformite_legale_initiale_xaf"]
        + config["fonds_roulement_initial_xaf"]
    )
    if total != config["capital_initial_xaf"]:
        raise ValueError(f"Allocation du capital incohérente : {total} != {config['capital_initial_xaf']}")
    return {
        "CAPEX kits Starlink (XAF)": kit_capex,
        "Sécurisation électrique (XAF)": config["securisation_electrique_xaf"],
        "Conformité légale initiale (XAF)": config["conformite_legale_initiale_xaf"],
        "Fonds de roulement initial (XAF)": config["fonds_roulement_initial_xaf"],
        "Capital total alloué (XAF)": total,
    }


def build_model(config: dict = CONFIG) -> pd.DataFrame:
    """Construit les flux mensuels, sans distribution de dividendes en cours d'année."""
    allocation = capital_allocation(config)
    months = np.arange(1, config["mois_simulation"] + 1)
    kits_sold = np.asarray(config["kits_vendus_par_mois"], dtype=int)
    if len(kits_sold) != config["mois_simulation"]:
        raise ValueError("La liste des ventes doit couvrir exactement 12 mois")
    if kits_sold.sum() > config["nombre_kits_achetes"]:
        raise ValueError("Les ventes simulées dépassent le stock de kits acheté")

    # Une marge brute de 20 % signifie : prix = coût / (1 - marge).
    selling_price = config["cout_kit_xaf"] / (1 - config["marge_brute_kits_pct"])
    kit_revenue = kits_sold * selling_price
    kit_cogs = kits_sold * config["cout_kit_xaf"]
    kit_gross_profit = kit_revenue - kit_cogs

    tickets = (
        config["nombre_hotspots"]
        * config["jours_exploitation_mois"]
        * config["tickets_par_hotspot_par_jour"]
    )
    hotspot_revenue = tickets * config["prix_micro_ticket_xaf"]
    subscription_cost = (
        config["nombre_hotspots"] * config["abonnement_starlink_par_hotspot_xaf"]
    )
    maintenance_cost = config["nombre_hotspots"] * config["maintenance_par_hotspot_mois_xaf"]
    operating_revenue = kit_revenue + hotspot_revenue
    operating_expenses = kit_cogs + subscription_cost + maintenance_cost
    operating_profit = operating_revenue - operating_expenses
    taxes = np.maximum(operating_profit, 0) * config["taux_impot_resultat_exploitation"]
    distributable_profit = operating_profit - taxes

    model = pd.DataFrame(
        {
            "Mois": months,
            "Kits vendus": kits_sold,
            "Stock kits restant": config["nombre_kits_achetes"] - np.cumsum(kits_sold),
            "Tickets Hotspot": tickets,
            "CA kits (XAF)": kit_revenue,
            "CA Hotspot (XAF)": hotspot_revenue,
            "Chiffre d'affaires (XAF)": operating_revenue,
            "Coût kits vendus (XAF)": kit_cogs,
            "Marge brute kits (XAF)": kit_gross_profit,
            "Abonnements Starlink ARCEP (XAF)": subscription_cost,
            "Maintenance hotspots (XAF)": maintenance_cost,
            "Résultat d'exploitation (XAF)": operating_profit,
            "Impôt local 25% (XAF)": taxes,
            "Bénéfice net distribuable (XAF)": distributable_profit,
        }
    )
    model["Chiffre d'affaires cumulé (XAF)"] = model["Chiffre d'affaires (XAF)"].cumsum()
    model["Bénéfice net distribuable cumulé (XAF)"] = model["Bénéfice net distribuable (XAF)"].cumsum()
    model["Trésorerie de fin de mois avant distribution (XAF)"] = (
        config["fonds_roulement_initial_xaf"]
        + model["Bénéfice net distribuable cumulé (XAF)"]
    )
    for key, value in allocation.items():
        model[key] = value
    return model


def calculate_summary(model: pd.DataFrame, config: dict = CONFIG) -> dict:
    """Retourne les métriques annuelles de tokenisation."""
    annual_revenue = float(model["Chiffre d'affaires (XAF)"].sum())
    annual_operating_profit = float(model["Résultat d'exploitation (XAF)"].sum())
    annual_taxes = float(model["Impôt local 25% (XAF)"].sum())
    annual_net_profit = float(model["Bénéfice net distribuable (XAF)"].sum())
    capital = config["capital_initial_xaf"]
    tokens = config["nombre_tokens"]
    return {
        "capital_initial_xaf": capital,
        "nombre_tokens": tokens,
        "valeur_nominale_token_xaf": config["valeur_nominale_token_xaf"],
        "kits_vendus_annuels": int(model["Kits vendus"].sum()),
        "chiffre_affaires_annuel_xaf": annual_revenue,
        "resultat_exploitation_annuel_xaf": annual_operating_profit,
        "impots_annuels_xaf": annual_taxes,
        "benefice_net_apres_impots_xaf": annual_net_profit,
        "yield_net_reel_pct": annual_net_profit / capital * 100,
        "dividende_exact_par_token_xaf": annual_net_profit / tokens,
        "tresorerie_fin_mois_12_avant_distribution_xaf": float(
            model["Trésorerie de fin de mois avant distribution (XAF)"].iloc[-1]
        ),
    }


def format_xaf(value: float) -> str:
    return f"{value:,.2f} XAF".replace(",", " ")


def main() -> None:
    model = build_model()
    summary = calculate_summary(model)
    output_path = Path(__file__).with_name("financial_model_output.csv")
    model.to_csv(output_path, index=False)
    print("=== MODÈLE RECALIBRÉ STARLINK / HOTSPOT — N'DJAMENA ===")
    print(f"Chiffre d'affaires annuel : {format_xaf(summary['chiffre_affaires_annuel_xaf'])}")
    print(f"Bénéfice net après impôts : {format_xaf(summary['benefice_net_apres_impots_xaf'])}")
    print(f"Yield net réel           : {summary['yield_net_reel_pct']:.2f} %")
    print(f"Dividende exact/token    : {format_xaf(summary['dividende_exact_par_token_xaf'])}")
    print(f"Résultats détaillés      : {output_path.name}")


if __name__ == "__main__":
    main()
