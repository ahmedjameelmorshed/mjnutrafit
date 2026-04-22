import asyncio
import concurrent.futures
import json
import threading
from typing import Any

import httpx

from config import BACKEND_URL


def _headers(authorization: str) -> dict[str, str]:
    if not authorization.lower().startswith("bearer "):
        return {"Authorization": f"Bearer {authorization}"}
    return {"Authorization": authorization}


def _apply_dashboard_response(out: dict[str, Any], r: httpx.Response) -> None:
    out["dashboard"] = r.json() if r.status_code == 200 else {"error": r.status_code, "detail": r.text[:300]}


def _apply_progress_response(out: dict[str, Any], r: httpx.Response) -> None:
    if r.status_code == 200:
        logs = r.json()
        if isinstance(logs, list):
            out["recentProgressLogs"] = logs[:5]
        else:
            out["recentProgressLogs"] = logs
    else:
        out["recentProgressLogs"] = {"error": r.status_code, "detail": r.text[:300]}


def _apply_user_response(out: dict[str, Any], r: httpx.Response) -> None:
    if r.status_code == 200:
        u = r.json()
        if isinstance(u, dict):
            u.pop("password", None)
        out["user"] = u
    else:
        out["user"] = None


def _apply_client_profile_response(out: dict[str, Any], r: httpx.Response) -> None:
    if r.status_code == 200:
        out["clientProfileApi"] = r.json()
    else:
        out["clientProfileApi"] = None
        out["clientProfileApiError"] = {"status": r.status_code, "detail": r.text[:300]}


async def fetch_client_bundle_async(authorization: str) -> dict[str, Any]:
    h = _headers(authorization)
    base = BACKEND_URL.rstrip("/")
    timeout = httpx.Timeout(22.0, connect=4.0)
    limits = httpx.Limits(max_keepalive_connections=8, max_connections=16)
    out: dict[str, Any] = {}
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        rd, rp, ru, rc = await asyncio.gather(
            client.get(f"{base}/api/dashboard/client", headers=h),
            client.get(f"{base}/api/progress", headers=h),
            client.get(f"{base}/api/users/currentUser", headers=h),
            client.get(f"{base}/api/users/client-profile", headers=h),
        )
    _apply_dashboard_response(out, rd)
    _apply_progress_response(out, rp)
    _apply_user_response(out, ru)
    _apply_client_profile_response(out, rc)
    return out


def fetch_client_bundle(authorization: str) -> dict[str, Any]:
    def _run_async() -> dict[str, Any]:
        return asyncio.run(fetch_client_bundle_async(authorization))

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return _run_async()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_run_async).result(timeout=45.0)


def normalize_coach_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    dash = bundle.get("dashboard")
    dash_ok = isinstance(dash, dict) and "error" not in dash

    raw_cp = bundle.get("clientProfileApi")
    if "clientProfileApi" not in bundle:
        fitness = dash.get("clientProfile") if dash_ok else None
    else:
        fitness = raw_cp
        if fitness is None and dash_ok:
            fitness = dash.get("clientProfile")

    logs = bundle.get("recentProgressLogs")
    logs_ok = isinstance(logs, list)

    user = bundle.get("user")
    account = None
    if isinstance(user, dict):
        account = {
            "id": user.get("id"),
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "email": user.get("email"),
            "role": user.get("role"),
            "status": user.get("status"),
        }

    warnings: list[str] = []
    if isinstance(dash, dict) and "error" in dash:
        warnings.append(f"dashboard:{dash['error']}")
    rp = bundle.get("recentProgressLogs")
    if isinstance(rp, dict) and "error" in rp:
        warnings.append(f"progress:{rp['error']}")
    cp_err = bundle.get("clientProfileApiError")
    if cp_err:
        warnings.append(f"client_profile:{cp_err.get('status')}")
    if user is None:
        warnings.append("account:unavailable")

    return {
        "account": account,
        "fitnessProfile": fitness,
        "hasCompletedFitnessIntake": bool(fitness),
        "hasCompletedOnboarding": dash.get("hasCompletedOnboarding") if dash_ok else None,
        "activePlan": dash.get("currentPlan") if dash_ok else None,
        "latestWeight": dash.get("latestWeight") if dash_ok else None,
        "recentProgressLogs": logs if logs_ok else None,
        "dataLoadWarnings": warnings,
    }


def bundle_to_prompt_block(bundle: dict[str, Any]) -> str:
    try:
        return json.dumps(
            normalize_coach_bundle(bundle),
            separators=(",", ":"),
            default=str,
        )
    except Exception:
        return str(bundle)
