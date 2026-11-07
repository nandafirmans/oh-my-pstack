import { createAssistantMessageEventStream } from "@oh-my-pi/pi-ai";

export default function (pi) {
  pi.registerProvider("pstack-offline", {
    baseUrl: "http://127.0.0.1:9",
    apiKey: "offline-fixture-not-a-credential",
    api: "pstack-offline",
    models: [{
      id: "fixture",
      name: "Pstack offline compatibility fixture",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 131072,
      maxTokens: 1024,
    }],
    streamSimple: (model, context) => {
      const stream = createAssistantMessageEventStream();
      const last = context.messages.at(-1);
      const text = typeof last?.content === "string" ? last.content
        : last?.content?.map(part => part.text ?? "").join("") ?? "";
      const operation = ["READ", "TASK"].find(name =>
        last?.role !== "toolResult" && text.includes(`PSTACK_OFFLINE_${name} `));
      const marker = `PSTACK_OFFLINE_${operation} `;
      const payload = operation ? text.slice(text.lastIndexOf(marker) + marker.length).trim() : "";
      const call = operation ? {
        type: "toolCall", id: `offline-${context.messages.length}`,
        name: operation === "READ" ? "read" : "task",
        arguments: operation === "READ" ? { path: payload } : JSON.parse(payload),
      } : undefined;
      const message = {
        role: "assistant", api: model.api, provider: model.provider, model: model.id,
        content: call ? [call] : [{ type: "text", text: "Offline fixture completed. No inference occurred." }],
        stopReason: call ? "toolUse" : "stop", timestamp: Date.now(),
        usage: { input: 7, output: 3, cacheRead: 0, cacheWrite: 0, totalTokens: 10,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      };
      stream.push({ type: "start", partial: message });
      if (call) {
        stream.push({ type: "toolcall_start", contentIndex: 0, partial: message });
        stream.push({ type: "toolcall_end", contentIndex: 0, toolCall: call, partial: message });
      }
      stream.push({ type: "done", reason: message.stopReason, message });
      return stream;
    },
  });
}
