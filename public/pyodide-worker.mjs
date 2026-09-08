import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";

const MAX_OUTPUT_LENGTH = 4_000;
const pyodideReady = loadPyodide({
  jsglobals: Object.freeze(Object.create(null)),
});
const notifyHost = self.postMessage.bind(self);

function unavailableCapability() {
  throw new Error(
    "Browser and network APIs are unavailable in the Python runner.",
  );
}

function disableCapability(target, name) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  if (!descriptor) {
    return;
  }

  try {
    Object.defineProperty(target, name, {
      configurable: false,
      enumerable: descriptor.enumerable,
      value: unavailableCapability,
      writable: false,
    });
  } catch {
    // A missing or immutable browser API is already unavailable to learner code.
  }
}

function lockDownWorkerCapabilities() {
  const blockedGlobals = [
    "BroadcastChannel",
    "EventSource",
    "SharedWorker",
    "WebSocket",
    "WebTransport",
    "Worker",
    "XMLHttpRequest",
    "caches",
    "close",
    "fetch",
    "importScripts",
    "indexedDB",
    "postMessage",
  ];

  for (const name of blockedGlobals) {
    let target = globalThis;
    while (target) {
      disableCapability(target, name);
      target = Object.getPrototypeOf(target);
    }
  }
}

const NEUTRALIZE_BRIDGE_REFERENCES = `
import pyodide._package_loader as __nerdcode_package_loader
import pyodide.webloop as __nerdcode_webloop

__nerdcode_webloop.scheduleCallback = None
__nerdcode_package_loader.loadedPackages = {}
del __nerdcode_package_loader
del __nerdcode_webloop
`;

const PURGE_BRIDGE_MODULES = `
import gc as __nerdcode_gc
import sys as __nerdcode_sys

def __nerdcode_purge_bridge_modules():
    allowed = frozenset(__nerdcode_sys.stdlib_module_names)
    for name in tuple(__nerdcode_sys.modules):
        if name.partition(".")[0] not in allowed:
            __nerdcode_sys.modules.pop(name, None)
    for name in ("js", "pyodide", "pyodide_js"):
        globals().pop(name, None)

__nerdcode_purge_bridge_modules()
del __nerdcode_purge_bridge_modules
__nerdcode_gc.collect()
del __nerdcode_gc
del __nerdcode_sys
`;

const IMPORT_GUARD = `
import sys as __nerdcode_guard_sys

def __nerdcode_install_import_guard():
    allowed = frozenset(__nerdcode_guard_sys.stdlib_module_names)
    string_type = str
    blocked_error = ImportError
    is_instance = isinstance

    def guard(event, args):
        if event != "import" or not args:
            return
        name = args[0]
        if is_instance(name, string_type):
            root = name.partition(".")[0]
            if root not in allowed:
                raise blocked_error(
                    f"Only Python standard-library imports are available (blocked: {root})"
                )

    __nerdcode_guard_sys.addaudithook(guard)

__nerdcode_install_import_guard()
del __nerdcode_install_import_guard
del __nerdcode_guard_sys
`;

let activeOutput = "";

try {
  const pyodide = await pyodideReady;
  pyodide.runPython(NEUTRALIZE_BRIDGE_REFERENCES);
  pyodide.unregisterJsModule("js");
  pyodide.unregisterJsModule("pyodide_js");
  pyodide.runPython(PURGE_BRIDGE_MODULES);
  pyodide.runPython(IMPORT_GUARD);

  pyodide.setStdout({
    batched(text) {
      if (activeOutput.length < MAX_OUTPUT_LENGTH) {
        activeOutput = `${activeOutput}${text}\n`.slice(0, MAX_OUTPUT_LENGTH);
      }
    },
  });
  pyodide.setStderr({
    batched(text) {
      if (activeOutput.length < MAX_OUTPUT_LENGTH) {
        activeOutput = `${activeOutput}${text}\n`.slice(0, MAX_OUTPUT_LENGTH);
      }
    },
  });

  lockDownWorkerCapabilities();
  notifyHost({ type: "ready" });
} catch (error) {
  notifyHost({
    type: "init-error",
    message: error instanceof Error ? error.message : "Python could not start.",
  });
}

const HARNESS = `
import builtins as __nerdcode_builtins
import json as __nerdcode_json
import sys as __nerdcode_sys

def __nerdcode_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.partition(".")[0]
    if root not in __nerdcode_sys.stdlib_module_names:
        raise ImportError(f"Only Python standard-library imports are available (blocked: {root})")
    return __nerdcode_original_import(name, globals, locals, fromlist, level)

__nerdcode_safe_builtins = dict(vars(__nerdcode_builtins))
__nerdcode_safe_builtins["__import__"] = __nerdcode_import
__nerdcode_scope = {
    "__builtins__": __nerdcode_safe_builtins,
    "__name__": "__main__",
}

__nerdcode_original_import = __nerdcode_builtins.__import__
__nerdcode_builtins.__import__ = __nerdcode_import
try:
    exec(compile(__nerdcode_source, "<solution>", "exec"), __nerdcode_scope)
    exec(compile(__nerdcode_runner, "<runner>", "exec"), __nerdcode_scope)
    __nerdcode_args = __nerdcode_json.loads(__nerdcode_args_json)
    __nerdcode_result = __nerdcode_scope["__nerdcode_run"](__nerdcode_args)
finally:
    __nerdcode_builtins.__import__ = __nerdcode_original_import

__nerdcode_result
`;

function jsonSafe(value) {
  const converted =
    value && typeof value.toJs === "function"
      ? value.toJs({ dict_converter: Object.fromEntries })
      : value;

  return JSON.parse(JSON.stringify(converted));
}

self.addEventListener("message", async (event) => {
  const reply = event.ports[0];
  if (!reply) {
    return;
  }

  try {
    const pyodide = await pyodideReady;
    const results = [];

    for (const testCase of event.data.cases) {
      activeOutput = "";
      const dict = pyodide.globals.get("dict");
      const globals = dict();
      dict.destroy();
      globals.set("__nerdcode_source", event.data.source);
      globals.set("__nerdcode_runner", event.data.runnerCode);
      globals.set("__nerdcode_args_json", JSON.stringify(testCase.args));

      try {
        const value = pyodide.runPython(HARNESS, { globals });
        try {
          results.push({
            actual: jsonSafe(value),
            output: activeOutput.trim(),
          });
        } finally {
          if (value && typeof value.destroy === "function") {
            value.destroy();
          }
        }
      } catch (error) {
        results.push({
          error:
            error instanceof Error ? error.message : "Python execution failed.",
          output: activeOutput.trim(),
        });
      } finally {
        globals.destroy();
      }
    }

    reply.postMessage({ results });
  } catch (error) {
    reply.postMessage({
      error:
        error instanceof Error ? error.message : "Python execution failed.",
    });
  } finally {
    reply.close();
  }
});
