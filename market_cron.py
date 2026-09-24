#!/usr/bin/env python3
"""Hourly deterministic-by-state market simulation for the SMAXOF1 dashboard.

This is a transparent demonstration index, not a market price oracle and not
financial advice. It does not send transactions or modify the smart contract.
"""
from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

from mahrasoft_token_model import audit_checks, build_pnl, build_token_yield, validate_config

STATE_PATH = Path(__file__).with_name("market_state.json")
INCIDENT_PATH = Path(__file__).with_name("incident_state.json")
SALES_PATH = Path(__file__).with_name("epos") / "sales_history.json"
MAHRASOFT_SUMMARY_PATH = Path(__file__).with_name("mahrasoft_model_summary.json")
MAHRASOFT_PNL_PATH = Path(__file__).with_name("mahrasoft_consolidated_pnl.csv")
MAHRASOFT_YIELD_PATH = Path(__file__).with_name("mahrasoft_token_yield.csv")
INITIAL_PRICE_XAF = 500.0
MIN_CHANGE_PCT = -1.2
MAX_CHANGE_PCT = 1.8
MAX_HISTORY_POINTS = 720

TRANSPARENCY = {
    "physical_capital_xaf": 8_000_000,
    "operational_treasury_xaf": 2_000_000,
    "available_liquidity_xaf": 10_710_000,
    "cap_table": {
        "founder": {"share_pct": 50.0, "value_xaf": 10_000_000},
        "investors": {"share_pct": 50.0, "value_xaf": 10_000_000},
    },
}


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {
            "asset": "SMAXOF1",
            "currency": "XAF",
            "current_price_xaf": INITIAL_PRICE_XAF,
            "previous_price_xaf": INITIAL_PRICE_XAF,
            "change_pct": 0.0,
            "updated_at": None,
            "history": [],
            "transparency": TRANSPARENCY,
        }
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def incident_is_active() -> bool:
    if not INCIDENT_PATH.exists():
        return False
    try:
        return bool(json.loads(INCIDENT_PATH.read_text(encoding="utf-8")).get("active", False))
    except (OSError, json.JSONDecodeError):
        return False


def load_sales_summary() -> dict:
    """Read the versioned ePOS ledger; malformed rows are ignored defensively."""
    try:
        rows = json.loads(SALES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        rows = []
    if not isinstance(rows, list):
        rows = []
    valid = []
    for row in rows:
        try:
            if isinstance(row, dict) and row.get("status", "paid") == "paid" and float(row.get("amount_xaf", 0)) > 0:
                valid.append(row)
        except (TypeError, ValueError):
            continue
    revenue = round(sum(float(row.get("amount_xaf", 0)) for row in valid), 2)
    return {"sales_count": len(valid), "revenue_xaf": revenue}


def next_change_pct() -> float:
    # Normal distribution centred on a modest positive drift, clipped to the
    # requested realistic hourly range.
    sampled = random.gauss(0.30, 0.80)
    return round(max(MIN_CHANGE_PCT, min(MAX_CHANGE_PCT, sampled)), 4)


def update_state(state: dict) -> dict:
    previous = float(state.get("current_price_xaf", INITIAL_PRICE_XAF))
    active = incident_is_active()
    was_active = bool(state.get("incident_active", False))
    if active and not was_active:
        state["pre_incident_price_xaf"] = previous
    if not active and was_active:
        previous = float(state.get("pre_incident_price_xaf", previous))
        state.pop("pre_incident_price_xaf", None)
    if active:
        current = round(float(state.get("pre_incident_price_xaf", previous)) * 0.70, 2)
        change_pct = -30.0
    else:
        change_pct = next_change_pct()
        current = round(previous * (1.0 + change_pct / 100.0), 2)
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    sales = load_sales_summary()
    transparency = dict(TRANSPARENCY)
    transparency["epos_revenue_xaf"] = sales["revenue_xaf"]
    transparency["epos_sales_count"] = sales["sales_count"]
    transparency["available_liquidity_xaf"] = round(TRANSPARENCY["available_liquidity_xaf"] + sales["revenue_xaf"], 2)
    history = list(state.get("history", []))
    history.append({"timestamp": timestamp, "price_xaf": current, "change_pct": change_pct})
    state.update(
        {
            "asset": "SMAXOF1",
            "currency": "XAF",
            "current_price_xaf": current,
            "previous_price_xaf": previous,
            "change_pct": change_pct,
            "incident_active": active,
            "updated_at": timestamp,
            "history": history[-MAX_HISTORY_POINTS:],
            "transparency": transparency,
        }
    )
    return state


def update_mahrasoft_model() -> dict:
    """Rebuild the consolidated Mahrasoft outputs on every cloud tick."""
    validate_config()
    pnl = build_pnl()
    yield_schedule = build_token_yield(pnl)
    checks = audit_checks(pnl, yield_schedule)
    pnl.to_csv(MAHRASOFT_PNL_PATH, index=False)
    yield_schedule.to_csv(MAHRASOFT_YIELD_PATH, index=False)
    summary = {
        "company": "Mahrasoft Innovations",
        "valuation_xaf": 327_957_000,
        "tokenized_offering_xaf": 65_591_400,
        "updated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "pnl": pnl.to_dict(orient="records"),
        "token_yield": yield_schedule.to_dict(orient="records"),
        "audit_checks": checks,
    }
    MAHRASOFT_SUMMARY_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return summary


def main() -> None:
    state = update_state(load_state())
    model = update_mahrasoft_model()
    state["mahrasoft"] = {
        "company": model["company"],
        "valuation_xaf": model["valuation_xaf"],
        "tokenized_offering_xaf": model["tokenized_offering_xaf"],
        "year_1_net_profit_xaf": model["pnl"][0]["net profit XAF"],
        "year_1_roi_pct": model["token_yield"][0]["annualized ROI %"],
        "audit_pass": model["audit_checks"]["all_checks_pass"],
        "updated_at": model["updated_at"],
    }
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"{state['asset']} | {state['previous_price_xaf']:.2f} -> "
        f"{state['current_price_xaf']:.2f} XAF | {state['change_pct']:+.4f}% | "
        f"{state['updated_at']}"
    )


if __name__ == "__main__":
    main()
