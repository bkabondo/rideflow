"""RideFlow rate-ride (Python). Replaces app/api/rides/[id]/rate/route.ts.
  POST /api/rides/<id>/rate  { score, comment? }  ->  rating row"""
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


def _rest(method, path, tok, body=None, extra=None):
    h = {"apikey": ANON, "Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return _http(method, f"{SUPABASE_URL}/rest/v1/{path}", h, json.dumps(body) if body is not None else None)


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        b = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        user, tok = _user(self.headers)
        if not user:
            return self._json(401, {"error": "Unauthorized"})
        segs = [s for s in urllib.parse.urlparse(self.path).path.split("/") if s]
        rid = segs[segs.index("rides") + 1] if "rides" in segs else None
        length = int(self.headers.get("content-length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        score, comment = body.get("score"), body.get("comment")
        if not score or score < 1 or score > 5:
            return self._json(400, {"error": "Score must be between 1 and 5"})

        s, t = _rest("GET", f"rideflow_rides?id=eq.{urllib.parse.quote(str(rid))}&select=*", tok)
        rides = json.loads(t or "[]") if s < 400 else []
        if not rides:
            return self._json(404, {"error": "Ride not found"})
        ride = rides[0]
        if ride.get("status") != "completed":
            return self._json(400, {"error": "Can only rate completed rides"})
        is_rider = ride.get("rider_id") == user["id"]
        is_driver = ride.get("driver_id") == user["id"]
        if not is_rider and not is_driver:
            return self._json(403, {"error": "Not part of this ride"})
        rated_user = ride["driver_id"] if is_rider else ride["rider_id"]

        s2, t2 = _rest("POST", "rideflow_ratings", tok, [{
            "ride_id": rid, "rated_by": user["id"], "rated_user": rated_user,
            "score": score, "comment": comment or None,
        }], {"Prefer": "return=representation"})
        if s2 >= 400:
            return self._json(500, {"error": t2})
        rating = json.loads(t2 or "[]")
        rating = rating[0] if rating else None

        # recompute average
        s3, t3 = _rest("GET", f"rideflow_ratings?rated_user=eq.{rated_user}&select=score", tok)
        scores = [r["score"] for r in json.loads(t3 or "[]")] if s3 < 400 else []
        if scores:
            avg = round(sum(scores) / len(scores) * 10) / 10
            _rest("PATCH", f"rideflow_users?id=eq.{rated_user}", tok, {"rating": avg})
        return self._json(200, rating)
