/**
 * WebMCP integration layer.
 *
 * Feature-detects both `document.modelContext` (current spec location) and the
 * deprecated `navigator.modelContext` alias. Falls back to the official
 * @mcp-b/webmcp-polyfill so the app remains fully agent-drivable in browsers
 * without the flag enabled.
 */
import {
  initializeWebMCPPolyfill,
} from "@mcp-b/webmcp-polyfill";
import { toJSONSchema, type ZodType } from "zod";
import { logToolCall } from "./activityStore";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WebMCPStatus {
  mode: "native" | "polyfill" | "unavailable";
}

let cachedModelContext: any = null;
let status: WebMCPStatus["mode"] = "unavailable";

export function getWebMCPStatus(): WebMCPStatus {
  return { mode: status };
}

function findNativeModelContext(): any {
  const docAny = document as any;
  const navAny = navigator as any;
  if (docAny.modelContext && typeof docAny.modelContext.registerTool === "function") {
    return docAny.modelContext;
  }
  if (navAny.modelContext && typeof navAny.modelContext.registerTool === "function") {
    return navAny.modelContext;
  }
  return null;
}

/**
 * Initialize WebMCP: prefer native, install the polyfill otherwise.
 * Verifies the modelContext is actually usable (some embedded contexts disable
 * it via Origin-Agent-Cluster or Permissions-Policy) and degrades gracefully.
 */
export async function initWebMCP(): Promise<void> {
  const native = findNativeModelContext();
  if (native) {
    try {
      await native.getTools();
      cachedModelContext = native;
      status = "native";
      return;
    } catch {
      /* native present but locked down — try the polyfill below */
    }
  }
  try {
    await initializeWebMCPPolyfill();
  } catch (err) {
    console.warn("[webmcp] polyfill install failed", err);
  }
  const mc = findNativeModelContext();
  if (!mc) {
    status = "unavailable";
    return;
  }
  try {
    await mc.getTools();
    cachedModelContext = mc;
    status = "polyfill";
  } catch (err) {
    console.warn(
      "[webmcp] modelContext is locked down in this context " +
        "(Origin-Agent-Cluster / Permissions-Policy). Tools disabled; the app still works for humans.",
      err,
    );
    status = "unavailable";
  }
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ZodType;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  /** Executes against app state. Return a JSON-serializable object. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  execute: (input: any) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Registers a tool with validation, structured errors, and activity logging.
 * Every invocation is visible in the on-page Agent Activity panel — tools
 * should never act invisibly.
 */
export async function registerTool(def: ToolDefinition): Promise<boolean> {
  const mc = cachedModelContext ?? findNativeModelContext();
  if (!mc) {
    console.warn(`[webmcp] cannot register "${def.name}" — no modelContext available`);
    return false;
  }
  let jsonSchema: Record<string, unknown>;
  try {
    jsonSchema = toJSONSchema(def.inputSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
  } catch (err) {
    console.error(`[webmcp] failed to convert schema for "${def.name}"`, err);
    return false;
  }

  try {
    await mc.registerTool(
      {
        name: def.name,
        description: def.description,
        inputSchema: jsonSchema,
        ...(def.annotations ? { annotations: def.annotations } : {}),
        execute: async (rawInput: unknown) => {
          const id = logToolCall({ tool: def.name, args: rawInput, status: "running" });
          try {
            const parsed = def.inputSchema.parse(rawInput ?? {});
            const result = await def.execute(parsed);
            logToolCall({ id, tool: def.name, args: rawInput, status: "success", result });
            return result;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logToolCall({ id, tool: def.name, args: rawInput, status: "error", result: { error: message } });
            throw err;
          }
        },
      },
      { signal: undefined },
    );
    return true;
  } catch (err) {
    console.error(`[webmcp] registration failed for "${def.name}"`, err);
    return false;
  }
}
