"""RideFlow drivers list (Python). Replaces app/api/drivers/route.ts (admin-only)."""
import base64
import json
import os
import urllib.request
import urllib.parse
import urllib.error
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SRK = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
COOKIE_BASE = f"sb-{SUPABASE_URL.replace('https://', '').split('.')[0]}-auth-token"


def _http(method, url, headers=None, body=None, timeout=25):
    req = urllib.request.Request(url, data=(body.encode() if isinstance(body, str) else body), method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")


def _user(headers):
    ch = headers.get("cookie")
    if not ch:
        return None, None
    jar = SimpleCookie()
    try:
        jar.load(ch)
    except Exception:
        return None, None
    parts = []
    if COOKIE_BASE in jar:
        parts.append((-1, jar[COOKIE_BASE].value))
    i = 0
    while f"{COOKIE_BASE}.{i}" in jar:
        parts.append((i, jar[f"{COOKIE_BASE}.{i}"].value))
        i += 1
    if not parts:
        return None, None
    parts.sort(key=lambda p: p[0])
    raw = urllib.parse.unquote("".join(p[1] for p in parts))
    if raw.startswith("base64-"):
        raw = raw[len("base64-"):]
    try:
        tok = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode("utf-8", "ignore")).get("access_token")
    except Exception:
        return None, None
    if not tok:
        return None, None
    s, t = _http("GET", f"{SUPABASE_URL}/auth/v1/user", {"apikey": ANON, "Authorization": f"Bearer {tok}"})
    if s != 200:
        return None, None
    try:
        return json.loads(t), tok
    except Exception:
        return None, None


def _role(user_id, tok):
    s, t = _http("GET", f"{SUPABASE_URL}/rest/v1/rideflow_users?id=eq.{user_id}&select=role",
                 {"apikey": ANON, "Authorization": f"Bearer {tok}"})
    rows = json.loads(t or "[]") if s < 400 else []
    return rows[0].get("role") if rows else None


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        b = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        user, tok = _user(self.headers)
        if not user:
            return self._json(401, {"error": "Unauthorized"})
        if _role(user["id"], tok) != "admin":
            return self._json(403, {"error": "Forbidden"})
        s, t = _http("GET",
                     f"{SUPABASE_URL}/rest/v1/rideflow_users?role=eq.driver&order=full_name&select=id,full_name,email,rating",
                     {"apikey": SRK, "Authorization": f"Bearer {SRK}"})
        if s >= 400:
            return self._json(500, {"error": t})
        return self._json(200, json.loads(t or "[]"))
