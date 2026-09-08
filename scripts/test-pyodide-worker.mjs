import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const workerSource = readFileSync(
  new URL("../public/pyodide-worker.mjs", import.meta.url),
  "utf8",
);

const browserCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const executablePath = browserCandidates.find((candidate) =>
  existsSync(candidate),
);

if (!executablePath) {
  throw new Error(
    "Chrome or Edge is required for the Pyodide browser test. Set CHROME_PATH to its executable.",
  );
}

const harness = `<!doctype html>
<meta charset="utf-8">
<title>Pyodide Worker smoke test</title>
<script>
const INITIALIZATION_TIMEOUT_MS = 45_000;

function createRunner() {
  const worker = new Worker("/pyodide-worker.mjs", { type: "module" });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("initialization-timeout"));
    }, INITIALIZATION_TIMEOUT_MS);

    function settle(error) {
      clearTimeout(timer);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("message", onMessage);
      if (error) {
        worker.terminate();
        reject(error);
      } else {
        resolve(worker);
      }
    }

    function onError(event) {
      settle(new Error(event.message || "worker-error"));
    }

    function onMessage(event) {
      if (event.data?.type === "ready") {
        settle();
      } else if (event.data?.type === "init-error") {
        settle(new Error(event.data.message));
      }
    }

    worker.addEventListener("error", onError);
    worker.addEventListener("message", onMessage);
  });
}

let runnerPromise = createRunner();

globalThis.executeInRunner = async (payload, timeoutMs = 3_000) => {
  const worker = await runnerPromise;

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      worker.terminate();
      runnerPromise = createRunner();
      reject(new Error("execution-timeout"));
    }, timeoutMs);

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data);
    };
    channel.port1.onmessageerror = () => {
      clearTimeout(timer);
      channel.port1.close();
      reject(new Error("message-error"));
    };

    worker.postMessage(payload, [channel.port2]);
  });
};
</script>`;

const server = createServer((request, response) => {
  if (request.url === "/pyodide-worker.mjs") {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript; charset=utf-8",
    });
    response.end(workerSource);
    return;
  }

  if (request.url === "/" || request.url === "/favicon.ico") {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(harness);
    return;
  }

  response.writeHead(404);
  response.end();
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
assert(address && typeof address === "object");

const browser = await chromium.launch({ executablePath, headless: true });

async function execute(page, source, args = [1, 2, 3]) {
  return page.evaluate(
    ({ learnerArgs, learnerSource }) =>
      globalThis.executeInRunner({
        cases: [{ args: learnerArgs }],
        runnerCode: "def __nerdcode_run(args):\n    return solve(args)",
        source: learnerSource,
      }),
    { learnerArgs: args, learnerSource: source },
  );
}

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/`);

  const correct = await execute(
    page,
    "from collections import deque\ndef solve(values):\n    return list(deque(values))",
  );
  assert.deepEqual(
    correct.results[0].actual,
    [1, 2, 3],
    JSON.stringify(correct),
  );

  const wrong = await execute(page, "def solve(values):\n    return []");
  assert.notDeepEqual(wrong.results[0].actual, [1, 2, 3]);

  const syntaxError = await execute(page, "def solve(:\n    pass");
  assert.match(syntaxError.results[0].error, /SyntaxError|invalid syntax/);

  const noisy = await execute(
    page,
    'def solve(values):\n    print("x" * 5_000)\n    return len(values)',
  );
  assert.equal(noisy.results[0].actual, 3);
  assert.equal(noisy.results[0].output.length, 4_000);

  const bridges = await execute(
    page,
    'import sys\ndef solve(values):\n    return {name: name in sys.modules for name in ("js", "pyodide_js", "pyodide.code")}',
  );
  assert.deepEqual(bridges.results[0].actual, {
    js: false,
    "pyodide.code": false,
    pyodide_js: false,
  });

  const retainedBridgeDictionary = await execute(
    page,
    'import gc\ndef solve(values):\n    matches = []\n    for candidate in gc.get_objects():\n        try:\n            if isinstance(candidate, dict):\n                present = [name for name in ("js", "pyodide_js", "pyodide.code") if name in candidate and type(candidate[name]).__name__ == "JsProxy"]\n                if present:\n                    matches.append({name: type(candidate[name]).__name__ for name in present})\n        except Exception:\n            pass\n    return matches[:10]',
  );
  assert.deepEqual(
    retainedBridgeDictionary.results[0].actual,
    [],
    JSON.stringify(retainedBridgeDictionary),
  );

  const blockedImport = await execute(
    page,
    'def solve(values):\n    return __import__("js")',
  );
  assert.match(blockedImport.results[0].error, /standard-library imports/);

  await assert.rejects(
    execute(page, "def solve(values):\n    while True:\n        pass"),
    /execution-timeout/,
  );

  const afterTimeout = await execute(
    page,
    "def solve(values):\n    return sum(values)",
  );
  assert.equal(afterTimeout.results[0].actual, 6);

  console.log(
    `Pyodide browser smoke passed in ${executablePath} (${projectRoot}).`,
  );
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
