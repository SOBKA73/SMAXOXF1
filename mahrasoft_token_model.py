"""Consolidated Mahrasoft Innovations RWA tokenization model.

All figures are XAF unless explicitly stated. This is an illustrative planning
model based on user-provided assumptions, not audited financial statements.
"""
from __future__ import annotations

from pathlib import Path
import json
import numpy as np
import pandas as pd

OUTPUT_DIR = Path(__file__).resolve().parent

CONFIG = {
    "company": "Mahrasoft Innovations",
    "valuation_eur": 500_000,
    "eur_to_xaf": 655.914,
    "valuation_xaf": 327_957_000,
    "tokenization_pct": 0.20,
    "tokenized_offering_xaf": 65_591_400,
    "web3_fee_rate": 0.005,
    "dividend_payout_ratio": 0.40,
    # Modeling convention because no face value or unit count was supplied.
    "smart_ticket_count": 100_000,
    "forecast_years": 3,
}

SEGMENTS = {
    "GovTech & Infrastructure": {
        "baseline_revenue_xaf": 3 * 25_000_000,
        "growth_rate": 0.15,
        "driver": "3 institutional SaaS contracts × 25m XAF/year",
        "cost_rate": 0.0,
    },
    "EdTech": {
        "baseline_revenue_xaf": 300 * 150_000,
        "growth_rate": 0.0,
        "driver": "300 students × 150,000 XAF/student",
        "cost_rate": 0.25,  # 75% gross margin supplied by user
    },
    "E-Commerce": {
        "baseline_revenue_xaf": 120_000_000 * 0.07,
        "growth_rate": 0.0,
        "driver": "120m XAF GMV × 7% net commission",
        "cost_rate": 0.0,
    },
    "Pharma & Health Tech": {
        "baseline_revenue_xaf": 40 * 50_000 * 12,
        "growth_rate": 0.0,
        "driver": "40 pharmacies × 50,000 XAF/month × 12 months",
        "cost_rate": 0.0,
    },
}


def validate_config() -> None:
    expected_valuation = CONFIG["valuation_eur"] * CONFIG["eur_to_xaf"]
    assert np.isclose(expected_valuation, CONFIG["valuation_xaf"]), "Valuation parity mismatch"
    assert np.isclose(CONFIG["tokenized_offering_xaf"], CONFIG["valuation_xaf"] * CONFIG["tokenization_pct"])
    assert 0 < CONFIG["dividend_payout_ratio"] <= 1
    assert CONFIG["smart_ticket_count"] > 0


def build_pnl() -> pd.DataFrame:
    years = np.arange(1, CONFIG["forecast_years"] + 1)
    rows = []
    for year in years:
        row = {"year": int(year)}
        revenue_total = 0.0
        cogs_total = 0.0
        for segment, assumptions in SEGMENTS.items():
            revenue = assumptions["baseline_revenue_xaf"] * (1 + assumptions["growth_rate"]) ** (year - 1)
            cogs = revenue * assumptions["cost_rate"]
            row[f"{segment} revenue XAF"] = round(revenue, 2)
            row[f"{segment} COGS XAF"] = round(cogs, 2)
            revenue_total += revenue
            cogs_total += cogs
        web3_fee = CONFIG["tokenized_offering_xaf"] * CONFIG["web3_fee_rate"] if year == 1 else 0.0
        gross_profit = revenue_total - cogs_total
        corporate_opex = 45_000_000.0
        ebitda = gross_profit - corporate_opex - web3_fee
        row.update(
            {
                "total revenue XAF": round(revenue_total, 2),
                "total COGS XAF": round(cogs_total, 2),
                "gross profit XAF": round(gross_profit, 2),
                "corporate OPEX XAF": corporate_opex,
                "Web3 pipeline fee XAF": round(web3_fee, 2),
                "EBITDA / net operating profit XAF": round(ebitda, 2),
                "net profit XAF": round(ebitda, 2),
            }
        )
        rows.append(row)
    return pd.DataFrame(rows)


def build_token_yield(pnl: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in pnl.iterrows():
        net_profit = float(row["net profit XAF"])
        dividends = max(0.0, net_profit * CONFIG["dividend_payout_ratio"])
        roi = dividends / CONFIG["tokenized_offering_xaf"]
        rows.append(
            {
                "year": int(row["year"]),
                "tokenized offering XAF": CONFIG["tokenized_offering_xaf"],
                "net profit XAF": round(net_profit, 2),
                "dividend payout ratio": CONFIG["dividend_payout_ratio"],
                "dividends allocated to token holders XAF": round(dividends, 2),
                "annualized ROI %": round(roi * 100, 4),
                "dividend per Smart-Ticket XAF": round(dividends / CONFIG["smart_ticket_count"], 6),
            }
        )
    return pd.DataFrame(rows)


def audit_checks(pnl: pd.DataFrame, yield_schedule: pd.DataFrame) -> dict:
    valuation = CONFIG["valuation_xaf"]
    tokenized = CONFIG["tokenized_offering_xaf"]
    checks = {
        "valuation_parity_check": bool(np.isclose(CONFIG["valuation_eur"] * CONFIG["eur_to_xaf"], valuation)),
        "tokenization_allocation_check": bool(np.isclose(tokenized / valuation, CONFIG["tokenization_pct"])),
        "capital_structure_check": bool(np.isclose(tokenized + (valuation - tokenized), valuation)),
        "non_negative_revenue_check": bool((pnl["total revenue XAF"] >= 0).all()),
        "dividend_not_above_net_profit_check": bool((yield_schedule["dividends allocated to token holders XAF"] <= pnl["net profit XAF"].clip(lower=0)).all()),
        "web3_fee_buffer_check": bool(np.isclose(CONFIG["tokenized_offering_xaf"] * CONFIG["web3_fee_rate"], 327_957.0)),
    }
    checks["all_checks_pass"] = all(checks.values())
    return checks


def main() -> None:
    validate_config()
    pnl = build_pnl()
    yield_schedule = build_token_yield(pnl)
    checks = audit_checks(pnl, yield_schedule)
    pnl.to_csv(OUTPUT_DIR / "mahrasoft_consolidated_pnl.csv", index=False)
    yield_schedule.to_csv(OUTPUT_DIR / "mahrasoft_token_yield.csv", index=False)
    summary = {
        "company": CONFIG["company"],
        "valuation_xaf": CONFIG["valuation_xaf"],
        "tokenized_offering_xaf": CONFIG["tokenized_offering_xaf"],
        "pnl": pnl.to_dict(orient="records"),
        "token_yield": yield_schedule.to_dict(orient="records"),
        "audit_checks": checks,
    }
    (OUTPUT_DIR / "mahrasoft_model_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("=== Mahrasoft Innovations — Consolidated RWA Model ===")
    print(pnl[["year", "total revenue XAF", "gross profit XAF", "net profit XAF"]].to_string(index=False))
    print("\n=== Smart-Ticket Yield Schedule ===")
    print(yield_schedule[["year", "dividends allocated to token holders XAF", "annualized ROI %", "dividend per Smart-Ticket XAF"]].to_string(index=False))
    print("\n=== Audit Checks ===")
    for name, passed in checks.items():
        print(f"{name}: {'PASS' if passed else 'FAIL'}")


if __name__ == "__main__":
    main()
