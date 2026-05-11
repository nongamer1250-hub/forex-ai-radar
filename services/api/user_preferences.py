from __future__ import annotations

from database import get_user_profile, save_user_profile

ALLOWED_DENSITY = {"compact", "comfortable"}


def read_user_preferences(session: dict[str, object]) -> dict[str, object]:
    return get_user_profile(str(session["key_id"]), str(session["role"]))


def write_user_preferences(session: dict[str, object], payload: dict[str, object]) -> dict[str, object]:
    current = get_user_profile(str(session["key_id"]), str(session["role"]))
    watchlist = payload.get("watchlist", current["watchlist"])
    selected_pair = str(payload.get("selected_pair", current["selected_pair"]))
    density_mode = str(payload.get("density_mode", current["density_mode"]))
    notifications_enabled = bool(payload.get("notifications_enabled", current["notifications_enabled"]))
    normalized_watchlist = [str(item) for item in watchlist] if isinstance(watchlist, list) else current["watchlist"]
    if density_mode not in ALLOWED_DENSITY:
        density_mode = str(current["density_mode"])
    if selected_pair not in normalized_watchlist and normalized_watchlist:
        selected_pair = normalized_watchlist[0]
    return save_user_profile(
        owner_key_id=str(session["key_id"]),
        owner_role=str(session["role"]),
        watchlist=normalized_watchlist,
        selected_pair=selected_pair,
        density_mode=density_mode,
        notifications_enabled=notifications_enabled,
    )
