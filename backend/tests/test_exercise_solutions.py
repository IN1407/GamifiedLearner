"""End-to-end validation that every code exercise in the course is solvable:
a known-correct reference solution must pass all of that exercise's tests.

This guards against a shipped exercise whose tests are internally inconsistent
(wrong expected value, impossible spec). Test data (the `tests` arrays) is
mirrored from the frontend content modules; if an exercise's tests change,
update the mirror here.
"""

import pytest

from app.runner import run_exercise

# (exercise_id, reference_solution, tests) — tests mirror frontend content.
SOLUTIONS: list[tuple[str, str, list[dict]]] = [
    (
        "ex-fstring",
        'def describe(name, age):\n    return f"{name} is {age} years old"',
        [
            {"name": "a", "code": 'assert describe("Ada", 36) == "Ada is 36 years old"'},
            {"name": "b", "code": 'assert describe("Grace", 45) == "Grace is 45 years old"'},
            {"name": "c", "code": 'assert describe("Baby", 0) == "Baby is 0 years old"'},
        ],
    ),
    (
        "ex-fizzbuzz-ish",
        'def classify(n):\n    if n == 0: return "zero"\n    if n < 0: return "negative"\n    if n <= 9: return "small"\n    return "big"',
        [
            {"name": "a", "code": 'assert classify(0) == "zero"'},
            {"name": "b", "code": 'assert classify(-5) == "negative"'},
            {"name": "c", "code": 'assert classify(3) == "small"'},
            {"name": "d", "code": 'assert classify(9) == "small"'},
            {"name": "e", "code": 'assert classify(10) == "big"'},
        ],
    ),
    (
        "ex-sum-evens",
        "def sum_evens(numbers):\n    return sum(n for n in numbers if n % 2 == 0)",
        [
            {"name": "a", "code": "assert sum_evens([1, 2, 3, 4, 5, 6]) == 12"},
            {"name": "b", "code": "assert sum_evens([1, 3, 5]) == 0"},
            {"name": "c", "code": "assert sum_evens([]) == 0"},
            {"name": "d", "code": "assert sum_evens([-2, -1, 4]) == 2"},
        ],
    ),
    (
        "ex-checkpoint-1",
        "def temp_report(temps):\n    if not temps:\n        return {'count': 0, 'mean': 0.0, 'above_freezing': 0}\n    return {'count': len(temps), 'mean': sum(temps)/len(temps), 'above_freezing': sum(1 for t in temps if t > 0)}",
        [
            {"name": "a", "code": 'assert temp_report([10, -5, 0, 20]) == {"count": 4, "mean": 6.25, "above_freezing": 2}'},
            {"name": "b", "code": 'assert temp_report([]) == {"count": 0, "mean": 0.0, "above_freezing": 0}'},
            {"name": "c", "code": 'assert temp_report([-1, -2]) == {"count": 2, "mean": -1.5, "above_freezing": 0}'},
        ],
    ),
    (
        "ex-slice",
        "def middle(items):\n    return items[1:-1] if len(items) >= 3 else []",
        [
            {"name": "a", "code": "assert middle([1, 2, 3, 4, 5]) == [2, 3, 4]"},
            {"name": "b", "code": 'assert middle(["a", "b", "c"]) == ["b"]'},
            {"name": "c", "code": "assert middle([1, 2]) == []"},
            {"name": "d", "code": "xs = [1,2,3,4]\nmiddle(xs)\nassert xs == [1,2,3,4]"},
        ],
    ),
    (
        "ex-wordcount",
        "def word_counts(text):\n    counts = {}\n    for w in text.lower().split():\n        counts[w] = counts.get(w, 0) + 1\n    return counts",
        [
            {"name": "a", "code": 'assert word_counts("the cat the dog") == {"the": 2, "cat": 1, "dog": 1}'},
            {"name": "b", "code": 'assert word_counts("Hi hi HI") == {"hi": 3}'},
            {"name": "c", "code": 'assert word_counts("") == {}'},
        ],
    ),
    (
        "ex-checkpoint-2",
        "def clean_users(records):\n    out = []\n    for r in records:\n        name = r['name'].strip()\n        if name and r['age'] >= 0:\n            out.append({'name': name.title(), 'age': r['age']})\n    return out",
        [
            {"name": "a", "code": 'assert clean_users([{"name": "  ada ", "age": 36}, {"name": "", "age": 20}, {"name": "bob", "age": -1}]) == [{"name": "Ada", "age": 36}]'},
            {"name": "b", "code": 'assert clean_users([{"name": "grace", "age": 0}]) == [{"name": "Grace", "age": 0}]'},
            {"name": "c", "code": "assert clean_users([]) == []"},
            {"name": "d", "code": 'orig = [{"name": " x ", "age": 1}]\nclean_users(orig)\nassert orig == [{"name": " x ", "age": 1}]'},
        ],
    ),
    (
        "ex-bankish",
        "class XpTracker:\n    def __init__(self):\n        self.xp = 0\n    def add(self, amount):\n        if amount > 0:\n            self.xp += amount\n        return self.xp\n    def level(self):\n        return self.xp // 100 + 1",
        [
            {"name": "a", "code": "t = XpTracker()\nassert t.xp == 0 and t.level() == 1"},
            {"name": "b", "code": "t = XpTracker()\nassert t.add(50) == 50 and t.add(60) == 110"},
            {"name": "c", "code": "t = XpTracker()\nt.add(250)\nassert t.level() == 3"},
            {"name": "d", "code": "t = XpTracker()\nt.add(-40)\nassert t.xp == 0"},
            {"name": "e", "code": "a, b = XpTracker(), XpTracker()\na.add(10)\nassert b.xp == 0"},
        ],
    ),
    (
        "ex-safe-div",
        "def parse_ratio(text):\n    try:\n        a, b = text.split('/')\n        return int(a) / int(b)\n    except (ValueError, ZeroDivisionError):\n        return None",
        [
            {"name": "a", "code": 'assert parse_ratio("3/4") == 0.75'},
            {"name": "b", "code": 'assert parse_ratio("10/5") == 2.0'},
            {"name": "c", "code": 'assert parse_ratio("hello") is None'},
            {"name": "d", "code": 'assert parse_ratio("a/b") is None'},
            {"name": "e", "code": 'assert parse_ratio("1/0") is None'},
        ],
    ),
    (
        "ex-json-roundtrip",
        "import json\ndef update_config(json_text, key, value):\n    try:\n        d = json.loads(json_text)\n    except json.JSONDecodeError:\n        return 'invalid'\n    d[key] = value\n    return json.dumps(d, sort_keys=True)",
        [
            {"name": "a", "code": 'import json\nout = update_config(\'{"lr": 0.1}\', "lr", 0.01)\nassert json.loads(out) == {"lr": 0.01}'},
            {"name": "b", "code": 'out = update_config(\'{"b": 1}\', "a", 2)\nassert out == \'{"a": 2, "b": 1}\''},
            {"name": "c", "code": 'assert update_config("not json", "a", 1) == "invalid"'},
        ],
    ),
    (
        "ex-checkpoint-3",
        "import json\ndef parse_events(lines):\n    total = 0\n    users = set()\n    errors = 0\n    for line in lines:\n        try:\n            r = json.loads(line)\n            u, xp = r['user'], r['xp']\n            if not isinstance(u, str) or not isinstance(xp, int) or isinstance(xp, bool) or xp < 0:\n                raise ValueError\n            total += xp\n            users.add(u)\n        except Exception:\n            errors += 1\n    return {'total_xp': total, 'users': sorted(users), 'errors': errors}",
        [
            {"name": "a", "code": 'r = parse_events([\'{"user": "ada", "xp": 10}\', \'{"user": "bob", "xp": 5}\'])\nassert r == {"total_xp": 15, "users": ["ada", "bob"], "errors": 0}'},
            {"name": "b", "code": 'r = parse_events(["{oops", \'{"user": "ada", "xp": 1}\'])\nassert r["errors"] == 1 and r["total_xp"] == 1'},
            {"name": "c", "code": 'r = parse_events([\'{"user": "x"}\', \'{"user": "y", "xp": -5}\'])\nassert r["errors"] == 2 and r["total_xp"] == 0'},
            {"name": "d", "code": 'r = parse_events([\'{"user": "ada", "xp": 1}\', \'{"user": "ada", "xp": 2}\'])\nassert r["users"] == ["ada"]'},
        ],
    ),
    (
        "ex-decorator",
        "def counted(fn):\n    def wrapper(*args, **kwargs):\n        wrapper.calls += 1\n        return fn(*args, **kwargs)\n    wrapper.calls = 0\n    return wrapper",
        [
            {"name": "a", "code": "@counted\ndef f(x):\n    return x * 2\nf(1); f(2); f(3)\nassert f.calls == 3"},
            {"name": "b", "code": "@counted\ndef g(a, b=1):\n    return a + b\nassert g(2, b=3) == 5"},
            {"name": "c", "code": "@counted\ndef h1():\n    pass\n@counted\ndef h2():\n    pass\nh1()\nassert h1.calls == 1 and h2.calls == 0"},
        ],
    ),
    (
        "ex-generator",
        "def batches(items, size):\n    for i in range(0, len(items), size):\n        yield items[i:i+size]",
        [
            {"name": "a", "code": "assert list(batches([1,2,3,4], 2)) == [[1,2],[3,4]]"},
            {"name": "b", "code": "assert list(batches([1,2,3,4,5], 2)) == [[1,2],[3,4],[5]]"},
            {"name": "c", "code": "assert list(batches([1,2], 10)) == [[1,2]]"},
            {"name": "d", "code": "assert list(batches([], 3)) == []"},
            {"name": "e", "code": "import types\nassert isinstance(batches([1], 1), types.GeneratorType)"},
        ],
    ),
    (
        "ex-checkpoint-4",
        "def retry(times):\n    def decorator(fn):\n        def wrapper(*args, **kwargs):\n            last = None\n            for _ in range(times):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception as e:\n                    last = e\n            raise last\n        return wrapper\n    return decorator",
        [
            {"name": "a", "code": 'attempts = []\n@retry(3)\ndef flaky():\n    attempts.append(1)\n    if len(attempts) < 3:\n        raise ValueError("boom")\n    return "ok"\nassert flaky() == "ok" and len(attempts) == 3'},
            {"name": "b", "code": '@retry(2)\ndef always_fails():\n    raise RuntimeError("nope")\ntry:\n    always_fails()\n    assert False, "should have raised"\nexcept RuntimeError:\n    pass'},
            {"name": "c", "code": "calls = []\n@retry(5)\ndef fine(x):\n    calls.append(1)\n    return x + 1\nassert fine(1) == 2 and len(calls) == 1"},
        ],
    ),
    (
        "ex-route-logic",
        "import math\ndef paginate(items, page, per_page):\n    if page < 1 or per_page < 1:\n        raise ValueError\n    start = (page - 1) * per_page\n    return {'items': items[start:start+per_page], 'page': page, 'total_pages': math.ceil(len(items)/per_page)}",
        [
            {"name": "a", "code": 'r = paginate(list(range(10)), 1, 3)\nassert r == {"items": [0,1,2], "page": 1, "total_pages": 4}'},
            {"name": "b", "code": 'r = paginate(list(range(10)), 4, 3)\nassert r["items"] == [9]'},
            {"name": "c", "code": "assert paginate([1,2], 5, 2)['items'] == []"},
            {"name": "d", "code": "try:\n    paginate([1], 0, 5)\n    assert False\nexcept ValueError:\n    pass"},
        ],
    ),
    (
        "ex-checkpoint-5",
        "def validate_chat_request(data):\n    errors = []\n    p = data.get('prompt')\n    if not isinstance(p, str) or not p.strip():\n        errors.append('prompt: required and non-empty')\n    t = data.get('temperature', 0.7)\n    if not isinstance(t, (int, float)) or isinstance(t, bool) or not (0 <= t <= 2):\n        errors.append('temperature: out of range')\n    m = data.get('max_tokens', 256)\n    if not isinstance(m, int) or isinstance(m, bool) or not (1 <= m <= 4096):\n        errors.append('max_tokens: invalid')\n    return errors",
        [
            {"name": "a", "code": 'assert validate_chat_request({"prompt": "hi", "temperature": 1.0, "max_tokens": 100}) == []'},
            {"name": "b", "code": 'assert validate_chat_request({"prompt": "hi"}) == []'},
            {"name": "c", "code": 'errs = validate_chat_request({})\nassert len(errs) == 1 and "prompt" in errs[0]'},
            {"name": "d", "code": 'errs = validate_chat_request({"prompt": "   "})\nassert len(errs) == 1 and "prompt" in errs[0]'},
            {"name": "e", "code": 'errs = validate_chat_request({"prompt": "x", "temperature": 3})\nassert len(errs) == 1 and "temperature" in errs[0]'},
            {"name": "f", "code": 'errs = validate_chat_request({"prompt": "x", "max_tokens": "many"})\nassert len(errs) == 1 and "max_tokens" in errs[0]'},
            {"name": "g", "code": 'errs = validate_chat_request({"temperature": -1, "max_tokens": 0})\nassert len(errs) == 3'},
        ],
    ),
    (
        "ex-dot",
        "def dot(a, b):\n    if len(a) != len(b):\n        raise ValueError\n    return sum(x*y for x, y in zip(a, b))\ndef matvec(M, x):\n    return [dot(row, x) for row in M]",
        [
            {"name": "a", "code": "assert dot([1,2,3], [4,5,6]) == 32"},
            {"name": "b", "code": "try:\n    dot([1], [1,2])\n    assert False\nexcept ValueError:\n    pass"},
            {"name": "c", "code": "assert matvec([[1,2],[3,4]], [5,6]) == [17, 39]"},
            {"name": "d", "code": "assert matvec([[1,0],[0,1]], [7,8]) == [7, 8]"},
        ],
    ),
    (
        "ex-graddesc",
        "def grad(x):\n    return 2 * (x - 3)\ndef gradient_descent(x0, lr, steps):\n    x = x0\n    for _ in range(steps):\n        x = x - lr * grad(x)\n    return x",
        [
            {"name": "a", "code": "assert grad(5) == 4 and grad(3) == 0"},
            {"name": "b", "code": 'result = gradient_descent(10.0, 0.1, 100)\nassert abs(result - 3) < 0.01, f"got {result}"'},
            {"name": "c", "code": "assert gradient_descent(7.0, 0.1, 0) == 7.0"},
            {"name": "d", "code": "assert abs(gradient_descent(-20.0, 0.2, 200) - 3) < 0.01"},
        ],
    ),
    (
        "ex-checkpoint-6",
        "import math\ndef softmax(logits):\n    m = max(logits)\n    exps = [math.exp(x - m) for x in logits]\n    s = sum(exps)\n    return [e / s for e in exps]",
        [
            {"name": "a", "code": "p = softmax([2.0, 1.0, 0.1])\nassert abs(sum(p) - 1.0) < 1e-9"},
            {"name": "b", "code": "p = softmax([2.0, 1.0, 0.1])\nassert p[0] > p[1] > p[2]"},
            {"name": "c", "code": "p = softmax([5.0, 5.0])\nassert abs(p[0] - 0.5) < 1e-9 and abs(p[1] - 0.5) < 1e-9"},
            {"name": "d", "code": "p = softmax([1000.0, 999.0])\nassert abs(sum(p) - 1.0) < 1e-9 and p[0] > p[1]"},
            {"name": "e", "code": "import math\np = softmax([1.0, 0.0])\nexpected = math.exp(1) / (math.exp(1) + 1)\nassert abs(p[0] - expected) < 1e-9"},
        ],
    ),
    (
        "ex-forward",
        "def relu(v):\n    return [max(0.0, x) for x in v]\ndef _matvec_add(M, x, b):\n    return [sum(m_i * x_i for m_i, x_i in zip(row, x)) + bi for row, bi in zip(M, b)]\ndef mlp_forward(x, W1, b1, W2, b2):\n    h = relu(_matvec_add(W1, x, b1))\n    return _matvec_add(W2, h, b2)",
        [
            {"name": "a", "code": "assert relu([-1.0, 0.0, 2.5]) == [0.0, 0.0, 2.5]"},
            {"name": "b", "code": "h = relu(_matvec_add([[1,-1],[0,2]], [1,2], [0,-1]))\nassert h == [0, 3]"},
            {"name": "c", "code": "out = mlp_forward([1,2], [[1,-1],[0,2]], [0,-1], [[1,1]], [0.5])\nassert out == [3.5]"},
            {"name": "d", "code": "out = mlp_forward([2], [[1]], [0], [[1]], [0])\nassert out == [2]"},
        ],
    ),
    (
        "ex-backprop",
        "import math\ndef sigmoid(z):\n    return 1 / (1 + math.exp(-z))\ndef grads(x, y, w, b, v):\n    z = w * x + b\n    h = sigmoid(z)\n    y_hat = v * h\n    d = 2 * (y_hat - y)\n    dL_dv = d * h\n    sig_prime = h * (1 - h)\n    dL_dw = d * v * sig_prime * x\n    dL_db = d * v * sig_prime\n    return dL_dv, dL_dw, dL_db",
        [
            {"name": "a", "code": "import math\ndef _num_grad(f, args, i, eps=1e-6):\n    a1 = list(args); a2 = list(args)\n    a1[i] += eps; a2[i] -= eps\n    return (f(*a1) - f(*a2)) / (2 * eps)\ndef _loss(x, y, w, b, v):\n    h = 1 / (1 + math.exp(-(w * x + b)))\n    return (v * h - y) ** 2\nargs = (1.5, 0.7, 0.3, -0.2, 0.8)\ndv, dw, db = grads(*args)\nx, y, w, b, v = args\nassert abs(dv - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 4)) < 1e-4\nassert abs(dw - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 2)) < 1e-4\nassert abs(db - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 3)) < 1e-4"},
            {"name": "b", "code": "import math\nh = 1/(1+math.exp(-(0.5*1.0+0.0)))\ndv, dw, db = grads(1.0, h, 0.5, 0.0, 1.0)\nassert abs(dv) < 1e-12 and abs(dw) < 1e-12 and abs(db) < 1e-12"},
        ],
    ),
    (
        "ex-checkpoint-7",
        "def momentum_descent(grad_fn, x0, lr, beta, steps):\n    x = x0\n    v = 0.0\n    for _ in range(steps):\n        v = beta * v + grad_fn(x)\n        x = x - lr * v\n    return x",
        [
            {"name": "a", "code": 'x = momentum_descent(lambda x: 2*x, 10.0, 0.05, 0.9, 200)\nassert abs(x) < 0.01, f"got {x}"'},
            {"name": "b", "code": "a = momentum_descent(lambda x: 2*x, 4.0, 0.1, 0.0, 1)\nassert abs(a - (4.0 - 0.1*8.0)) < 1e-12"},
            {"name": "c", "code": "xs = []\ndef g(x):\n    xs.append(x)\n    return 1.0\nx = momentum_descent(g, 0.0, 0.1, 1.0, 2)\nassert abs(x - (-0.3)) < 1e-12"},
        ],
    ),
    (
        "ex-bpe",
        "def most_frequent_pair(tokens):\n    from collections import Counter\n    c = Counter(zip(tokens, tokens[1:]))\n    return c.most_common(1)[0][0]\ndef merge_pair(tokens, pair):\n    out = []\n    i = 0\n    while i < len(tokens):\n        if i + 1 < len(tokens) and (tokens[i], tokens[i+1]) == pair:\n            out.append(tokens[i] + tokens[i+1])\n            i += 2\n        else:\n            out.append(tokens[i])\n            i += 1\n    return out",
        [
            {"name": "a", "code": 'assert most_frequent_pair(["a","b","a","b","c"]) == ("a","b")'},
            {"name": "b", "code": 'assert merge_pair(["a","b","a","b","c"], ("a","b")) == ["ab","ab","c"]'},
            {"name": "c", "code": 'assert merge_pair(["x","y"], ("a","b")) == ["x","y"]'},
            {"name": "d", "code": 'assert merge_pair(["a","a","a"], ("a","a")) == ["aa","a"]'},
        ],
    ),
    (
        "ex-attention",
        "import math\ndef softmax(xs):\n    m = max(xs)\n    exps = [math.exp(x - m) for x in xs]\n    s = sum(exps)\n    return [e / s for e in exps]\ndef attention(q, keys, values):\n    scale = math.sqrt(len(q))\n    scores = [sum(qi*ki for qi, ki in zip(q, k)) / scale for k in keys]\n    weights = softmax(scores)\n    dim = len(values[0])\n    return [sum(w * v[j] for w, v in zip(weights, values)) for j in range(dim)]",
        [
            {"name": "a", "code": "out = attention([10.0, 0.0], [[10.0, 0.0], [0.0, 10.0]], [[1.0, 0.0], [0.0, 1.0]])\nassert out[0] > 0.99 and out[1] < 0.01"},
            {"name": "b", "code": "out = attention([1.0], [[2.0], [2.0]], [[0.0], [10.0]])\nassert abs(out[0] - 5.0) < 1e-9"},
            {"name": "c", "code": "out = attention([1.0, 2.0], [[1.0, 0.0]], [[3.0, 4.0, 5.0]])\nassert out == [3.0, 4.0, 5.0]"},
        ],
    ),
    (
        "ex-checkpoint-8",
        "class KVCache:\n    def __init__(self):\n        self.keys = []\n        self.values = []\n    def step(self, k, v):\n        self.keys.append(k)\n        self.values.append(v)\n        n = len(self.keys)\n        naive = n * (n + 1) // 2\n        return (n, naive)",
        [
            {"name": "a", "code": "c = KVCache()\nc.step([1], [1])\nn, _ = c.step([2], [2])\nassert n == 2 and c.keys == [[1],[2]]"},
            {"name": "b", "code": "c = KVCache()\nassert c.step([0],[0])[1] == 1\nassert c.step([0],[0])[1] == 3\nassert c.step([0],[0])[1] == 6\nassert c.step([0],[0])[1] == 10"},
            {"name": "c", "code": "c = KVCache()\nc.step([1,2],[3,4])\nassert c.values == [[3,4]]"},
        ],
    ),
    (
        "ex-kv-math",
        "def kv_mha(layers, heads, d_head, bytes_per_val):\n    return 2 * layers * heads * d_head * bytes_per_val\ndef kv_gqa(layers, kv_heads, d_head, bytes_per_val):\n    return 2 * layers * kv_heads * d_head * bytes_per_val\ndef kv_latent(layers, d_latent, bytes_per_val):\n    return layers * d_latent * bytes_per_val\ndef context_gb(bytes_per_token, n_tokens):\n    return round(bytes_per_token * n_tokens / 1024**3, 2)",
        [
            {"name": "a", "code": "assert kv_mha(32, 32, 128, 2) == 524288"},
            {"name": "b", "code": "assert kv_gqa(32, 8, 128, 2) == 131072"},
            {"name": "c", "code": "assert kv_latent(32, 512, 2) == 32768"},
            {"name": "d", "code": "assert context_gb(524288, 32768) == 16.0"},
        ],
    ),
    (
        "ex-checkpoint-9",
        "def linear_attention(qs, ks, vs):\n    S = 0.0\n    ys = []\n    for q, k, v in zip(qs, ks, vs):\n        S += k * v\n        ys.append(q * S)\n    return ys",
        [
            {"name": "a", "code": "ys = linear_attention([1.0, 1.0], [2.0, 3.0], [10.0, 100.0])\nassert ys == [20.0, 320.0]"},
            {"name": "b", "code": "a = linear_attention([1.0], [5.0], [7.0])\nb = linear_attention([1.0, 9.9], [5.0, 9.9], [7.0, 9.9])\nassert a[0] == b[0] == 35.0"},
            {"name": "c", "code": "ys = linear_attention([1.0, 1.0, 1.0], [1.0, 0.0, 0.0], [4.0, 99.0, 99.0])\nassert ys == [4.0, 4.0, 4.0]"},
        ],
    ),
    (
        "ex-adapter",
        'def openai_like_api(prompt):\n    return {"choices": [{"message": {"content": f"[openai] {prompt}"}}]}\ndef anthropic_like_api(prompt):\n    return {"content": [{"type": "text", "text": f"[anthropic] {prompt}"}]}\ndef unified_chat(vendor, prompt):\n    if vendor == "openai_like":\n        return openai_like_api(prompt)["choices"][0]["message"]["content"]\n    if vendor == "anthropic_like":\n        return anthropic_like_api(prompt)["content"][0]["text"]\n    raise ValueError',
        [
            {"name": "a", "code": 'assert unified_chat("openai_like", "hi") == "[openai] hi"'},
            {"name": "b", "code": 'assert unified_chat("anthropic_like", "hi") == "[anthropic] hi"'},
            {"name": "c", "code": 'try:\n    unified_chat("mystery", "hi")\n    assert False\nexcept ValueError:\n    pass'},
        ],
    ),
    (
        "ex-checkpoint-10",
        "def fits_in_vram(n_params_b, quant, vram_gb, overhead_gb=1.5):\n    bpp = {'fp16': 2, 'q8': 1, 'q4': 0.5}\n    if quant not in bpp:\n        raise ValueError\n    weights = n_params_b * bpp[quant]\n    return (weights, weights + overhead_gb <= vram_gb)",
        [
            {"name": "a", "code": 'w, fits = fits_in_vram(7, "fp16", 16)\nassert w == 14.0 and fits is True'},
            {"name": "b", "code": 'w, fits = fits_in_vram(7, "fp16", 8)\nassert fits is False'},
            {"name": "c", "code": 'w, fits = fits_in_vram(7, "q4", 8)\nassert w == 3.5 and fits is True'},
            {"name": "d", "code": 'try:\n    fits_in_vram(7, "q2", 8)\n    assert False\nexcept ValueError:\n    pass'},
        ],
    ),
    (
        "ex-dataprep",
        "import json\ndef prep_dataset(records, eval_fraction):\n    valid = []\n    seen = set()\n    dropped = 0\n    for r in records:\n        ok = isinstance(r, dict) and isinstance(r.get('messages'), list) and len(r['messages']) >= 2\n        if ok:\n            for m in r['messages']:\n                if not (isinstance(m, dict) and isinstance(m.get('role'), str) and m['role'] and isinstance(m.get('content'), str) and m['content']):\n                    ok = False\n                    break\n        if ok and r['messages'][-1]['role'] != 'assistant':\n            ok = False\n        if not ok:\n            dropped += 1\n            continue\n        key = json.dumps(r, sort_keys=True)\n        if key in seen:\n            dropped += 1\n            continue\n        seen.add(key)\n        valid.append(r)\n    cut = int(len(valid) * (1 - eval_fraction))\n    return {'train': valid[:cut], 'eval': valid[cut:], 'dropped': dropped}",
        [
            {"name": "a", "code": 'ok = {"messages": [{"role": "user", "content": "q"}, {"role": "assistant", "content": "a"}]}\nbad1 = {"messages": [{"role": "user", "content": "q"}]}\nbad2 = {"nope": True}\nout = prep_dataset([ok, bad1, bad2, ok, dict(ok)], 0.5)\nassert out["dropped"] == 4 and len(out["train"]) + len(out["eval"]) == 1'},
            {"name": "b", "code": 'recs = [{"messages": [{"role": "user", "content": str(i)}, {"role": "assistant", "content": "a" + str(i)}]} for i in range(10)]\nout = prep_dataset(recs, 0.2)\nassert len(out["train"]) == 8 and len(out["eval"]) == 2\nassert out["train"][0]["messages"][0]["content"] == "0"'},
            {"name": "c", "code": 'r = {"messages": [{"role": "assistant", "content": "a"}, {"role": "user", "content": "q"}]}\nout = prep_dataset([r], 0.0)\nassert out["dropped"] == 1'},
        ],
    ),
    (
        "ex-checkpoint-11",
        "def lora_params(d, r, n_matrices):\n    full = n_matrices * d * d\n    lora = n_matrices * 2 * d * r\n    return {'full': full, 'lora': lora, 'ratio': round(lora / full, 4)}",
        [
            {"name": "a", "code": 'out = lora_params(4096, 16, 1)\nassert out["full"] == 4096*4096 and out["lora"] == 2*4096*16'},
            {"name": "b", "code": 'out = lora_params(4096, 16, 1)\nassert out["ratio"] == round(131072/16777216, 4) and out["ratio"] < 0.01'},
            {"name": "c", "code": 'out = lora_params(1000, 10, 7)\nassert out["full"] == 7_000_000 and out["lora"] == 140_000 and out["ratio"] == 0.02'},
        ],
    ),
    (
        "ex-cosine",
        "import math\ndef cosine(a, b):\n    na = math.sqrt(sum(x*x for x in a))\n    nb = math.sqrt(sum(x*x for x in b))\n    if na == 0 or nb == 0:\n        return 0.0\n    return sum(x*y for x, y in zip(a, b)) / (na * nb)\ndef top_k(query_vec, docs, k):\n    scored = sorted(docs, key=lambda d: cosine(query_vec, d[1]), reverse=True)\n    return [text for text, _ in scored[:k]]",
        [
            {"name": "a", "code": "assert abs(cosine([1, 2], [2, 4]) - 1.0) < 1e-9"},
            {"name": "b", "code": "assert abs(cosine([1, 0], [0, 1])) < 1e-9"},
            {"name": "c", "code": "assert cosine([0, 0], [1, 2]) == 0.0"},
            {"name": "d", "code": 'docs = [("cats", [1.0, 0.0]), ("dogs", [0.9, 0.1]), ("stocks", [0.0, 1.0])]\nassert top_k([1.0, 0.05], docs, 2) == ["cats", "dogs"]'},
        ],
    ),
    (
        "ex-checkpoint-12",
        "def chunk_text(text, max_words):\n    words = text.split()\n    return [' '.join(words[i:i+max_words]) for i in range(0, len(words), max_words)]\ndef score(query, chunk):\n    qs = set(query.lower().split())\n    cs = set(chunk.lower().split())\n    return len(qs & cs)\ndef retrieve(query, chunks, k):\n    scored = sorted(chunks, key=lambda c: score(query, c), reverse=True)\n    return scored[:k]\ndef build_prompt(query, retrieved):\n    lines = ['Answer using ONLY the context below.']\n    lines.extend(retrieved)\n    lines.append(f'Question: {query}')\n    return '\\n'.join(lines)",
        [
            {"name": "a", "code": 'cs = chunk_text("a b c d e", 2)\nassert cs == ["a b", "c d", "e"]'},
            {"name": "b", "code": 'assert score("reset password email", "To reset your password click the email link") == 3\nassert score("cat", "dogs only here") == 0'},
            {"name": "c", "code": 'chunks = ["billing and invoices", "reset your password here", "password and email reset steps"]\ntop = retrieve("reset password email", chunks, 2)\nassert top[0] == "password and email reset steps" and top[1] == "reset your password here"'},
            {"name": "d", "code": 'p = build_prompt("q?", ["c1", "c2"])\nassert "Answer using ONLY the context below." in p and "c1" in p and "c2" in p and "Question: q?" in p'},
        ],
    ),
    (
        "ex-capstone-core",
        "def answer_query(question, chunks, llm):\n    if not question.strip():\n        raise ValueError('empty question')\n    if not chunks:\n        return {'answer': 'No document loaded.', 'sources': []}\n    def score(c):\n        qs = set(question.lower().split())\n        cs = set(c.lower().split())\n        return len(qs & cs)\n    top = sorted(chunks, key=score, reverse=True)[:2]\n    prompt = 'Answer using ONLY the context below.\\n' + '\\n'.join(top) + f'\\nQuestion: {question}'\n    return {'answer': llm(prompt), 'sources': top}",
        [
            {"name": "a", "code": 'try:\n    answer_query("   ", ["c"], lambda p: "x")\n    assert False\nexcept ValueError:\n    pass'},
            {"name": "b", "code": 'called = []\nout = answer_query("q", [], lambda p: called.append(1) or "x")\nassert out == {"answer": "No document loaded.", "sources": []} and not called'},
            {"name": "c", "code": 'seen = {}\ndef fake(p):\n    seen["p"] = p\n    return "ans"\nout = answer_query("password reset", ["billing stuff", "reset password steps", "misc"], fake)\nassert "Answer using ONLY the context below." in seen["p"]\nassert "reset password steps" in seen["p"]\nassert "Question: password reset" in seen["p"]'},
            {"name": "d", "code": 'out = answer_query("password", ["a password chunk", "unrelated"], lambda p: "the answer")\nassert out["answer"] == "the answer" and out["sources"][0] == "a password chunk"'},
        ],
    ),
]


@pytest.mark.parametrize("ex_id,solution,tests", SOLUTIONS, ids=[s[0] for s in SOLUTIONS])
def test_reference_solution_passes_all(ex_id, solution, tests):
    result = run_exercise(solution, tests)
    assert result.ok, f"{ex_id}: runner error: {result.error}"
    failures = [(t.name, t.error) for t in result.results if not t.passed]
    assert result.all_passed, f"{ex_id}: reference solution failed tests: {failures}"


def test_every_code_exercise_has_a_reference_solution():
    """Guards against adding a code exercise without validating it here.
    Keep this count in sync with `type: 'exercise'` blocks in the frontend content."""
    assert len(SOLUTIONS) == 34
