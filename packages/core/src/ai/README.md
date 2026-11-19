# AI for the apps

`@pocket-apps/core/ai` lets an app send a request to Claude or OpenAI and get a checked answer. Read this file before you write or change an AI feature. The rules are in "AI features" in `AGENTS.md`: the `package.json` fields, the notices and the rules for the answer schema. The reasons are in "AI settings for all apps" and "Own AI interface on the official SDKs" in `docs/decisions.md`.

All names in this file come from `@pocket-apps/core/ai`. A full example with a chat and a photo is `apps/trainingsbuch/src/ai-entry-dialog.tsx`.

## Setup by the user

The user sets up the AI once, in the launcher ("KI einrichten") or in an AI app: the provider (Claude or OpenAI), the API key and the model for this provider. "Verbindung prüfen" asks the provider for its list of models. This shows if the key works and fills the model choice. All apps use this setup.

- The provider and the model of each provider are in `ai/ai.json` in the data folder. They sync with the folder.
- The API key stays in the browser (IndexedDB). The user types it once per browser and per web address.

## `useAi()`

Call `useAi()` only inside `DataFileProvider`. Its `state` has one of these statuses:

- `loading`: the app reads the AI settings. Show nothing or a short German text such as "Lädt …".
- `not-set-up`: the user set up no AI, or this browser has no key. Show `<AiSetupNotice feature="liest deine Notizen" onClose={reload} />`. `feature` is the German verb phrase after "Die KI …": the notice shows "Die KI liest deine Notizen. Dafür brauchst du einen eigenen API-Key …" and the button "KI einrichten". `onClose` runs when the dialog closes. `reload` then reads the settings again.
- `error`: the app cannot read the AI settings, for example because `ai/ai.json` is broken. Show `state.message`.
- `ready`: `state.ask(request)` sends a request. `state.provider` and `state.model` are the choice of the user. To let the user change the provider or the model, the app can show its own button that opens `<AiSettingsDialog open={open} onClose={...} />`. In `onClose`, close the dialog and call `reload()`. The launcher has the same dialog.

Call `useAi()` in the component. Call `state.ask()` in an event handler, for example when the user sends a message. For "Abbrechen", keep an `AbortController` per request, pass its `signal` and call `controller.abort()`.

```tsx
const { state, reload } = useAi(ask); // ask: the optional fake of the tests

// In the event handler:
if (state.status !== "ready") return; // the component shows the notice for the other statuses
const controller = new AbortController(); // keep it, so that "Abbrechen" can call abort()
const result = await state.ask({
  instructions: "…", // the task and the rules for the AI
  messages: [{ role: "user", text: notes, images: [image] }], // images: optional, see imageForAi()
  schema: resultSchema, // a zod schema: the shape of the answer
  signal: controller.signal, // optional: cancels the request
});
if (result.kind === "ok")
  use(result.data); // result.data has the type of the schema
else if (result.kind !== "canceled") show(aiMessage(result)); // a German message
```

## Results

`ask()` never throws. It returns `{ kind: "ok", data, reply, usage }` or a failure:

- `invalid-key`, `no-permission`, `no-credit`, `rate-limit`, `overloaded`, `offline`
- `canceled`: the signal aborted the request. The user started the cancel, so the app shows no message for it.
- `refused`: the AI declined the request.
- `bad-answer`: the answer is not JSON or does not match the schema.
- `error`, with `message`.

`aiMessage(result)` gives the German message for each failure.

## Conversations

For a conversation (for example a question of the AI back to the user), keep the messages in React state, with the type `AiMessage[]`. Do not keep them in the data file. A message of the user has `text` and optional `images`. A message of the AI has only `text`. The first message is a message of the user.

1. Send the first message.
2. After an answer, add `result.reply` and then the next message of the user.
3. Send all messages again. Keep `instructions` and `schema` the same in all rounds.

`result.reply` is the answer as a message of the AI: its `text` is the JSON text of the answer. Do not write messages of the AI yourself. To show the chat, use `result.data` of each round, not the JSON text.

If a round fails (for example `bad-answer` or `offline`), the messages stay as they were: the failed answer is not in them. Show `aiMessage(result)`, and let the user send the message again.

### Cost of each round

The model reads the full conversation in each round. Thus each round costs more than the round before. An image stays in its message, so it goes to the provider again in each round.

The provider keeps the start of the conversation in its cache for 5 minutes, if it has enough tokens (Claude Opus 5.5: 512, OpenAI: 1,024). An image has about 300 to 2,500 tokens. In the next round, the cached part costs only a part of the price. Put an image only into the message where the user added it, so that the start stays the same.

## Images

Call `await imageForAi(file)`. It accepts JPEG, PNG, GIF and WebP up to 3.75 MiB per image. Base64 makes the image 4/3 as large, and Claude accepts 5 MiB of base64 text. It returns:

- `{ kind: "ok", image }`: put `image` into `images` of the message of the user.
- `{ kind: "wrong-type" }` or `{ kind: "too-large" }`: `imageMessage(check)` gives the German message.

## Notices and cost

- `<AiDataNotice provider={state.provider} data="deine Notizen" />` goes next to the button that starts the request. `data` is a German noun phrase. The notice shows "Diese Daten gehen an Claude (Anthropic): deine Notizen. Sonst nichts."
- `<AiUsageSummary usage={result.usage} label="Diese Anfrage" />` shows the cost and the tokens after a request. `label` is the text before the badges. The badges show:
  - the cost, for example "ca. 1,8 US-Cent". The prices are in US dollars. The cost is known only for Claude models. For OpenAI, the summary shows only the tokens.
  - the tokens, for example "2.500 Token": all input, also the part from the cache, plus the output.
  - the part from the cache, for example "1.800 aus dem Cache", only if there is one.
- In a chat, show one summary for all rounds, with `label="Bisher"`. `result.usage` is the usage of one round. Keep the sum in state with the type `AiUsage | null`. Add the rounds up with `addUsage(total, result.usage)`, and start with `null`. If one round has no known price, the sum has no price either. A failed or canceled round gives no usage, but the provider can still charge it. Thus the sum can be a little too low.
- `formatUsage(usage)` gives a text without badges, for example "2.500 Token · ca. 1,8 US-Cent".

## Tests of an app

Give `App` the optional prop `ask` (type `AskAi`) and pass it to `useAi(ask)`. With a fake, `useAi()` is `ready` at once, with `provider: "anthropic"` and `model: "claude-test"` (`TEST_AI`). Then the unit tests need no key and no network. The fake gets the request, so a test can check the messages.

`AskAi` is generic, so a fake with fixed data needs a type assertion (allowed in tests):

```ts
const ask = vi.fn(() =>
  Promise.resolve({
    kind: "ok",
    data: { results: [] },
    reply: { role: "assistant", text: "{}" },
    usage: { inputTokens: 1, cachedTokens: 0, outputTokens: 1, costUsd: null },
  }),
) as unknown as AskAi;
```

For a conversation, give one answer per round: `vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)`.

## Tests of this module

- Replace the browser APIs: `vi.stubGlobal("indexedDB", new IDBFactory())` (from `fake-indexeddb`) and `vi.stubGlobal("fetch", ...)`.
- A fake `fetch` must return a new `Response` for each call, because the SDKs retry some errors. See `ask.test.ts`.
- In browser tests, answer the provider requests with `page.route()`, because the tests have no internet. See `e2e/launcher.spec.ts`.
