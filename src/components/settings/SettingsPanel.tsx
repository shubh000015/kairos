"use client";

import { Database, Download, Eye, Headphones, Leaf, Plug, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { exportAllData, importAllData, resetAllData } from "@/store/registry";
import { toSpotifyUri, useAudioEngineStore } from "@/store/useAudioEngineStore";
import { useRewardStore } from "@/store/useRewardStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Misc";
import { Segmented, Toggle } from "@/components/ui/Toggle";
import { toast } from "@/components/ui/Toast";
import { LocalFirstCard } from "./LocalFirstCard";

export function SettingsPanel() {
  const s = useSettingsStore();
  const rewards = useRewardStore();
  const audio = useAudioEngineStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const doExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kairos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported. Your data, your file.");
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const n = await importAllData(JSON.parse(await f.text()));
      toast(`Imported ${n} section${n === 1 ? "" : "s"}.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't import that file.");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader icon={<Eye className="size-5" />} title="Appearance & reading" description="Lower the volume of the interface itself." />
        <CardBody className="divide-y divide-border pt-2">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="text-ink">Theme</div>
            <Segmented label="Theme" value={s.theme} onChange={(v) => s.set("theme", v)} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="text-ink">Text size</div>
            <Segmented label="Text size" value={s.fontScale} onChange={(v) => s.set("fontScale", v)} options={[{ value: "normal", label: "Normal" }, { value: "large", label: "Large" }]} />
          </div>
          <Toggle id="spacing" label="Relaxed spacing" description="Wider letters and lines; helps many dyslexic and ADHD readers." checked={s.relaxedSpacing} onChange={(v) => s.set("relaxedSpacing", v)} />
          <Toggle id="motion" label="Reduce motion" description="Turns off the small animations." checked={s.reduceMotion} onChange={(v) => s.set("reduceMotion", v)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Leaf className="size-5" />} title="Focus" description="How blocks behave." />
        <CardBody className="divide-y divide-border pt-2">
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <div className="text-ink">Hyperfocus nudge</div>
              <div className="text-sm text-ink-muted">A quiet reminder to drink water and stretch after this long.</div>
            </div>
            <Segmented label="Hyperfocus nudge" value={s.hyperfocusGuardMin} onChange={(v) => s.set("hyperfocusGuardMin", v)} options={[{ value: 0, label: "Off" }, { value: 35, label: "35m" }, { value: 50, label: "50m" }, { value: 90, label: "90m" }]} />
          </div>
          <Toggle id="tension" label="Final-stretch pacing" description="Over the last three minutes the soundscape quickens a little: lo-fi gains a bassline, noise gets a slow pulse." checked={s.audioTension} onChange={(v) => s.set("audioTension", v)} />
          <Toggle id="rewards" label="Loot-drop breaks" description="When a block ends, roll for a surprise break instead of a fixed one." checked={rewards.enabled} onChange={rewards.setEnabled} />
          {rewards.enabled ? (
            <div className="py-3">
              <Toggle id="videos" label="Short videos in the pool" description="A rare drop plays one bounded clip right here. No feed, no autoplay-next." checked={rewards.allowVideos} onChange={rewards.setAllowVideos} />
              {rewards.allowVideos ? (
                <div className="mt-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (rewards.addVideo(videoUrl, videoTitle)) {
                        setVideoUrl("");
                        setVideoTitle("");
                        toast("Added to the loot pool.");
                      } else {
                        toast("That doesn't look like a YouTube link.");
                      }
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste a short YouTube link" aria-label="YouTube link" className="min-w-0 flex-1 py-1.5 text-sm" />
                    <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Name (optional)" aria-label="Video name" className="w-36 py-1.5 text-sm" />
                    <Button type="submit" size="sm" variant="soft" disabled={!videoUrl.trim()}>Add</Button>
                  </form>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-xs">
                    {rewards.videoPool().map((v) => (
                      <li key={v.id} className="group flex items-center justify-between gap-2 text-ink-muted">
                        <span className="truncate">{v.title} <span className="text-ink-faint">· ~{v.minutes}m</span></span>
                        <button type="button" onClick={() => rewards.removeVideo(v.id)} aria-label={`Remove ${v.title}`} className="text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink">remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="py-3 text-sm text-ink-muted">
            <div className="mb-1 text-ink">Keyboard</div>
            <ul className="space-y-1">
              <li><Kbd>/</Kbd> jump to the parking lot during focus</li>
              <li><Kbd>Esc</Kbd> leave the parking lot and get back to it</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      <LocalFirstCard />

      <Card>
        <CardHeader icon={<Headphones className="size-5" />} title="Cognitive audio (Spotify)" description="Match the music to the task's load, not your mood. Boring task → energy. Dense task → stillness." />
        <CardBody className="divide-y divide-border pt-2">
          <Toggle id="audio-enabled" label="Show the audio engine" description="The Spotify controller on the dashboard." checked={audio.enabled} onChange={(v) => audio.set("enabled", v)} />
          <Toggle id="audio-shift" label="Shift gear when a block starts" description="Auto mode reads the active task's energy tag: low → upbeat playlist, high → low-stimulation playlist." checked={audio.shiftOnStart} onChange={(v) => audio.set("shiftOnStart", v)} />
          <Toggle id="audio-fade" label="Dip volume on switch" description="A short fade so the change doesn't jolt. Needs a device with volume control." checked={audio.crossfade} onChange={(v) => audio.set("crossfade", v)} />
          <div className="flex flex-col gap-2 py-3">
            <PlaylistField label="High-energy playlist (brain-dead tasks)" hint="Video-game OSTs, synthwave, drum & bass." value={audio.highEnergyUri} onSave={(uri) => audio.set("highEnergyUri", uri)} />
            <PlaylistField label="Low-stimulation playlist (deep work)" hint="Ambient, film scores, brown noise." value={audio.lowStimUri} onSave={(uri) => audio.set("lowStimUri", uri)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Database className="size-5" />} title="Your data" description="Everything lives in this browser. Nothing is sent anywhere unless you export it." />
        <CardBody className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void doExport()}><Download className="size-4" /> Export JSON</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={doImport} className="sr-only" />
          </div>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} className="self-start text-sm text-ink-faint hover:text-ink">Start completely over…</button>
          ) : (
            <div className="rise-in flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span className="text-ink-muted">This erases tasks, notes, history and your companion. Export first if you might want them back.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Keep everything</Button>
              <Button variant="soft" size="sm" onClick={() => void resetAllData()}>Erase and restart</Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Plug className="size-5" />} title="Connect your AI assistant" description="Kairos ships an MCP server so ChatGPT, Claude, Cursor and others can help the ADHD way." />
        <CardBody className="flex flex-col gap-3 pt-2 text-sm text-ink-muted">
          <p>Add this URL as a remote MCP server / connector. The assistant gains tools for breaking tasks into tiny steps, planning a focus block, reframing shame-y self-talk, and more.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface-sunken px-3 py-1.5 font-mono text-xs text-ink">{mcpUrl ?? "…/api/mcp"}</code>
            <Button size="sm" onClick={() => { const u = `${window.location.origin}/api/mcp`; setMcpUrl(u); void navigator.clipboard?.writeText(u); toast("Copied the MCP URL."); }}>Copy URL</Button>
          </div>
          <p className="text-xs text-ink-faint">Full setup notes are in <code>docs/MCP.md</code>. The server is stateless and never sees your local data.</p>
        </CardBody>
      </Card>
    </div>
  );
}

function PlaylistField({ label, hint, value, onSave }: { label: string; hint: string; value: string; onSave: (uri: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const parsed = toSpotifyUri(shown);
  const dirty = draft !== null && draft !== value;
  return (
    <div className="text-sm">
      <div className="text-ink">{label}</div>
      <div className="mb-1.5 text-xs text-ink-muted">{hint}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={shown} onChange={(e) => setDraft(e.target.value)} placeholder="Paste a Spotify playlist link or URI" aria-label={label} className="min-w-0 flex-1 py-1.5 font-mono text-xs" />
        <Button
          size="sm"
          variant="soft"
          disabled={!dirty || !parsed}
          onClick={() => {
            if (parsed) {
              onSave(parsed);
              setDraft(null);
              toast("Playlist saved.");
            }
          }}
        >
          Save
        </Button>
      </div>
      {dirty && !parsed ? <div className="mt-1 text-xs text-urgent">That doesn&apos;t look like a Spotify playlist/album link.</div> : null}
    </div>
  );
}
