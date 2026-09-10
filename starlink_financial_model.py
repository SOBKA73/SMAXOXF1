"""
Modèle financier illustratif pour une activité de kits Starlink et Hotspot à N'Djamena.
Toutes les hypothèses opérationnelles sont regroupées dans CONFIG pour faciliter les tests.
Les montants sont exprimés en XAF et les résultats sont arrondis uniquement à l'affichage.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


CONFIG = {
    "capital_initial_xaf": 10_000_000,
    "nombre_tokens": 20_000,
    "valeur_nominale_token_xaf": 500,
    # Hypothèses commerciales mensuelles de départ
    "kits_vendus_mois_1": 3,
    "croissance_mensuelle_kits": 0.02,
    "prix_vente_kit_xaf": 450_000,
    "cout_achat_kit_xaf": 320_000,
    "tickets_hotspot_mois_1": 1_800,
    "croissance_mensuelle_tickets": 0.015,
    "prix_ticket_hotspot_xaf": 1_000,
    # Charges opérationnelles mensuelles
    "abonnements_starlink_xaf": 800_000,
    "amortissement_materiel_xaf": 200_000,
    "protection_electrique_xaf": 250_000,
    "autres_charges_exploitation_xaf": 350_000,
    "mois_simulation": 12,
}


def build_model(config: dict = CONFIG) -> pd.DataFrame:
    """Construit le compte d'exploitation mensuel sur 12 mois."""
    months = np.arange(1, config["mois_simulation"] + 1)
    kits = config["kits_vendus_mois_1"] * np.power(
        1 + config["croissance_mensuelle_kits"], months - 1
    )
    tickets = config["tickets_hotspot_mois_1"] * np.power(
        1 + config["croissance_mensuelle_tickets"], months - 1
    )

    kit_revenue = kits * config["prix_vente_kit_xaf"]
    hotspot_revenue = tickets * config["prix_ticket_hotspot_xaf"]
    revenue = kit_revenue + hotspot_revenue
    kit_costs = kits * config["cout_achat_kit_xaf"]
    operating_expenses = (
        config["abonnements_starlink_xaf"]
        + config["amortissement_materiel_xaf"]
        + config["protection_electrique_xaf"]
        + config["autres_charges_exploitation_xaf"]
    )
    net_profit = revenue - kit_costs - operating_expenses

    model = pd.DataFrame(
        {
            "Mois": months,
            "Kits vendus": kits,
            "Tickets Hotspot": tickets,
            "Revenus kits (XAF)": kit_revenue,
            "Revenus Hotspot (XAF)": hotspot_revenue,
            "Chiffre d'affaires (XAF)": revenue,
            "Coût achat kits (XAF)": kit_costs,
            "Abonnements Starlink (XAF)": config["abonnements_starlink_xaf"],
            "Amortissement matériel (XAF)": config["amortissement_materiel_xaf"],
            "Protection électrique (XAF)": config["protection_electrique_xaf"],
            "Autres charges exploitation (XAF)": config["autres_charges_exploitation_xaf"],
            "Bénéfice net mensuel (XAF)": net_profit,
        }
    )
    model["Chiffre d'affaires cumulé (XAF)"] = model["Chiffre d'affaires (XAF)"].cumsum()
    model["Bénéfice net cumulé (XAF)"] = model["Bénéfice net mensuel (XAF)"].cumsum()
    return model


def calculate_summary(model: pd.DataFrame, config: dict = CONFIG) -> dict:
    """Calcule les indicateurs annuels et le dividende par token."""
    annual_revenue = float(model["Chiffre d'affaires (XAF)"].sum())
    annual_net_profit = float(model["Bénéfice net mensuel (XAF)"].sum())
    capital = config["capital_initial_xaf"]
    tokens = config["nombre_tokens"]
    return {
        "capital_initial_xaf": capital,
        "nombre_tokens": tokens,
        "valeur_nominale_token_xaf": config["valeur_nominale_token_xaf"],
        "chiffre_affaires_annuel_xaf": annual_revenue,
        "benefice_net_annuel_xaf": annual_net_profit,
        "rendement_annuel_net_pct": annual_net_profit / capital * 100,
        "dividende_par_token_xaf": annual_net_profit / tokens,
        "benefice_net_mensuel_moyen_xaf": annual_net_profit / len(model),
    }


def format_xaf(value: float) -> str:
    return f"{value:,.2f} XAF".replace(",", " ")


def main() -> None:
    model = build_model()
    summary = calculate_summary(model)
    output_path = Path(__file__).with_name("financial_model_output.csv")
    model.to_csv(output_path, index=False)

    print("=== MODÈLE FINANCIER STARLINK / HOTSPOT — N'DJAMENA ===")
    print(f"Chiffre d'affaires annuel : {format_xaf(summary['chiffre_affaires_annuel_xaf'])}")
    print(f"Bénéfice net annuel       : {format_xaf(summary['benefice_net_annuel_xaf'])}")
    print(f"Rendement annuel net      : {summary['rendement_annuel_net_pct']:.2f} %")
    print(f"Dividende par token       : {format_xaf(summary['dividende_par_token_xaf'])}")
    print(f"Résultats détaillés       : {output_path.name}")


if __name__ == "__main__":
    main()
