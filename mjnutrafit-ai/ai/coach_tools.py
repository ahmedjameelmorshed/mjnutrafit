import json
from langchain_core.tools import tool

from ai.client_data import fetch_client_bundle, normalize_coach_bundle


def make_coach_tools(authorization: str):

    @tool(
        description="Fetch the latest MJNutraFit dashboard, progress logs, and account info. Call when the user asks for up-to-date numbers or says they just logged something."
    )
    def refresh_my_live_data() -> str:
        try:
            bundle = fetch_client_bundle(authorization)
            return json.dumps(
                normalize_coach_bundle(bundle),
                separators=(",", ":"),
                default=str,
            )
        except Exception as e:
            return json.dumps({"error": str(e)})

    return [refresh_my_live_data]
