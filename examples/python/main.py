"""Read a Saudi document into structured fields.

Standard library only — Python 3.9 or newer.

    export VOHO_API_KEY=voho_sk_live_...   # app.voho.ai -> API Tokens
    python examples/python/main.py

New accounts start with $25 of credit, so this costs nothing to try.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

KEY = os.environ.get("VOHO_API_KEY")
BASE = os.environ.get("VOHO_BASE_URL", "https://app.voho.ai")

if not KEY:
    sys.exit("Set VOHO_API_KEY first — create one at https://app.voho.ai/tokens")


def voho(path, body, raw=False):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.read() if raw else json.load(res)
    except urllib.error.HTTPError as err:
        detail = json.loads(err.read() or b"{}").get("error", {})
        sys.exit("%s: %s" % (detail.get("code", err.code), detail.get("message", "request failed")))


def spent(cents):
    print("\nCharged $%.2f from your Voho balance." % (cents / 100))

path = sys.argv[1] if len(sys.argv) > 1 else None
sample = BASE + "/samples/sample-invoice.pdf"

if path:
    with open(path, "rb") as fh:
        data = base64.b64encode(fh.read()).decode()
    mime = "image/png" if path.endswith(".png") else "application/pdf" if path.endswith(".pdf") else "image/jpeg"
else:
    print("No file given — reading the sample invoice at", sample)
    with urllib.request.urlopen(sample) as res:
        data = base64.b64encode(res.read()).decode()
    mime = "application/pdf"

out = voho("/v1/documents/extract", {"file": data, "mime_type": mime})

print("\n%s\n%s\n" % (out["document_type"], out["summary"]))
for f in out["fields"]:
    flag = "   " if f["confidence"] == "high" else " %s " % f["confidence"][0]
    print("%s%s: %s" % (flag, f["label"], f["value"]))
if out["warnings"]:
    print("\nWorth a look:", " · ".join(out["warnings"]))
spent(out["cost_cents"])
