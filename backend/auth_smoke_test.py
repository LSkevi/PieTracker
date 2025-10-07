import json, urllib.request, urllib.error, datetime, random, string
BASE = "http://127.0.0.1:8000"

def request(method, path, data=None, headers=None):
    url = BASE + path
    payload = None
    if data is not None:
        payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, e.read().decode()
    except Exception as e:
        return -1, str(e)

summary = []

# Generate unique email
stamp = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
rand = ''.join(random.choices(string.ascii_lowercase+string.digits, k=4))
email = f"smoke_{stamp}_{rand}@example.com"
username = f"smoke_{rand}_{stamp}".lower()[:30]
password = "Passw0rd!"  # meets complexity

# 1. Signup (username + email)
code, body = request("POST", "/auth/signup", {"email": email, "username": username, "password": password})
summary.append(("signup", code, body))
if code not in (200, 400):
    print("FAIL signup unexpected status", code, body)
    print(json.dumps(summary, indent=2))
    raise SystemExit(1)

# If user existed (unlikely), continue using same creds
# 2. Login (username based)
code, body = request("POST", "/auth/login", {"username": username, "password": password})
summary.append(("login", code, body))
if code != 200:
    print("FAIL login", code, body)
    print(json.dumps(summary, indent=2))
    raise SystemExit(1)

token = body['token']
user = body['user']
headers = {"Authorization": f"Bearer {token}", "X-User-Id": user['id']}

# 3. Me
code, body = request("GET", "/auth/me", headers=headers)
summary.append(("me", code, body))
if code != 200 or body.get('user', {}).get('id') != user['id']:
    print("FAIL me", code, body)
    print(json.dumps(summary, indent=2))
    raise SystemExit(1)

# 4. Create expense
expense_payload = {"amount": 12.34, "category": "Food", "description": "Smoke Test", "currency": "USD", "date": datetime.datetime.utcnow().strftime('%Y-%m-%d')}
code, body = request("POST", "/expenses", expense_payload, headers=headers)
summary.append(("create_expense", code, body))
if code != 200 or body.get('user_id') != user['id']:
    print("FAIL create expense", code, body)
    print(json.dumps(summary, indent=2))
    raise SystemExit(1)
created_id = body['id']

# 5. List month expenses
now = datetime.datetime.utcnow()
code, body = request("GET", f"/expenses/month/{now.year}/{now.month}", headers=headers)
summary.append(("list_month", code, body))
if code != 200 or not any(e['id'] == created_id for e in body):
    print("FAIL list month", code, body)
    print(json.dumps(summary, indent=2))
    raise SystemExit(1)

print("AUTH SMOKE TEST PASS")
for step, c, b in summary:
    preview = b if isinstance(b, dict) else str(b)
    print(f"- {step}: {c} -> {json.dumps(preview)[:200]}")
