import { Alert, AlertDescription, AlertTitle } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import {
  Focus,
  LayoutGrid,
  Magnet,
  Maximize,
  Minimize,
  RotateCcw,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createAttractorScene, type AttractorScene, type SceneStatus } from "./attractor-scene.ts";
import type { Attractor } from "./attractors.ts";
import { paramValues } from "./drift.ts";
import { pointerAt, type MouseMode } from "./mouse-effects.ts";
import { Explanation } from "./explanation.tsx";
import { PaletteSwatch } from "./palette-swatch.tsx";
import { PictureButton } from "./picture-button.tsx";
import { isPaletteId, PALETTES, type Palette, type PaletteId } from "./palettes.ts";
import type { StageView, ViewFactory } from "./webgl-view.ts";

const MODES: readonly { value: MouseMode; label: string; icon: LucideIcon; hint: string }[] = [
  {
    value: "lens",
    label: "Linse",
    icon: Focus,
    hint: "Die Maus biegt nur das Bild. Die Bahnen der Punkte bleiben gleich.",
  },
  {
    value: "gravity",
    label: "Schwerkraft",
    icon: Magnet,
    hint: "Die Maus zieht an den Punkten. Die Form ändert sich. „Zurücksetzen“ startet neu.",
  },
  {
    value: "rubber",
    label: "Gummi",
    icon: Waves,
    hint: "Die Linien folgen der Maus und federn zurück.",
  },
];

function isMode(value: string): value is MouseMode {
  return MODES.some((mode) => mode.value === value);
}

/** How often the text under the picture changes. */
const STATUS_INTERVAL_MS = 250;

const paramFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const strengthFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function AttractorStage({
  attractor,
  mode,
  onModeChange,
  palette,
  onPaletteChange,
  onBack,
  viewFactory,
}: {
  attractor: Attractor;
  mode: MouseMode;
  onModeChange: (mode: MouseMode) => void;
  palette: Palette;
  onPaletteChange: (palette: PaletteId) => void;
  onBack: () => void;
  viewFactory: ViewFactory;
}) {
  const [supported] = useState(() => viewFactory.supported());
  const [status, setStatus] = useState<SceneStatus | null>(null);
  // The browser has no Fullscreen API in an iframe without permission, and on an iPhone.
  const [canFullscreen] = useState(() => document.fullscreenEnabled);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AttractorScene | null>(null);
  const viewRef = useRef<StageView | null>(null);

  // The animation is an external system: it runs in requestAnimationFrame and draws with WebGL.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const scene = createAttractorScene(attractor, Math.random);
    const view = viewFactory.create(container, attractor, scene.lines, Math.random);
    sceneRef.current = scene;
    viewRef.current = view;

    const observer = new ResizeObserver(() => {
      view.resize(container.clientWidth, container.clientHeight);
    });
    observer.observe(container);

    let last = performance.now();
    let lastStatus = -Infinity;
    let frameId = requestAnimationFrame(tick);
    function tick(now: number): void {
      scene.frame((now - last) / 1000, view);
      last = now;
      if (now - lastStatus >= STATUS_INTERVAL_MS) {
        lastStatus = now;
        setStatus(scene.status());
      }
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      view.dispose();
      sceneRef.current = null;
      viewRef.current = null;
    };
  }, [attractor, viewFactory]);

  useEffect(() => {
    sceneRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    viewRef.current?.setPalette(palette);
  }, [palette]);

  // The user can also leave the full screen with Esc. Then only this event tells it.
  useEffect(() => {
    function onFullscreenChange(): void {
      setFullscreen(document.fullscreenElement !== null);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // The whole page goes into full screen, and the picture covers it. The tooltips show in an
  // element at the end of <body>. With only the picture in full screen, they are not visible.
  function enterFullscreen(): void {
    document.documentElement.requestFullscreen().catch(() => {
      // The browser refused the full screen. The picture stays in the page.
    });
  }

  function exitFullscreen(): void {
    document.exitFullscreen().catch(() => {
      // The full screen ended already.
    });
  }

  function updatePointer(event: PointerEvent<HTMLDivElement>, pressed: boolean): void {
    const box = event.currentTarget.getBoundingClientRect();
    sceneRef.current?.setPointer(pointerAt(box, event.clientX, event.clientY, pressed));
  }

  function clearPointer(): void {
    sceneRef.current?.setPointer(null);
  }

  const current = MODES.find((entry) => entry.value === mode);
  const display = status ?? { params: attractor.profiles[0], strength: 0 };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onBack}>
          <LayoutGrid aria-hidden="true" />
          Galerie
        </Button>
        <h2 className="font-heading text-lg font-semibold">{attractor.name}</h2>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        aria-label="Wirkung der Maus"
        className="flex-wrap"
        value={mode}
        onValueChange={(value) => {
          if (isMode(value)) onModeChange(value);
        }}
      >
        {MODES.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <Icon aria-hidden="true" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">{current?.hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          aria-label="Farben"
          className="flex-wrap"
          value={palette.id}
          onValueChange={(value) => {
            if (isPaletteId(value)) onPaletteChange(value);
          }}
        >
          {PALETTES.map((entry) => (
            <ToggleGroupItem
              key={entry.id}
              value={entry.id}
              aria-label={entry.name}
              title={entry.name}
            >
              <PaletteSwatch palette={entry} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="text-sm text-muted-foreground">Farben: {palette.name}</span>
      </div>

      {supported ? (
        <>
          <div className={fullscreen ? "fixed inset-0 z-40" : "relative"}>
            <div
              ref={containerRef}
              role="img"
              aria-label={`Animation des Attraktors ${attractor.name}`}
              className={
                fullscreen
                  ? "h-screen w-full touch-none overflow-hidden"
                  : "h-[60vh] min-h-64 w-full touch-none overflow-hidden rounded-2xl bg-muted"
              }
              onPointerMove={(event) => {
                updatePointer(event, event.buttons > 0);
              }}
              onPointerDown={(event) => {
                updatePointer(event, true);
              }}
              onPointerUp={(event) => {
                updatePointer(event, false);
              }}
              onPointerLeave={clearPointer}
              onPointerCancel={clearPointer}
            />
            {/* The buttons sit in the corner of the picture, as in a video player. */}
            <div
              className={
                fullscreen
                  ? "absolute right-4 bottom-4 flex gap-2"
                  : "absolute right-3 bottom-3 flex gap-2"
              }
            >
              <PictureButton
                label="Zurücksetzen"
                icon={RotateCcw}
                onClick={() => {
                  sceneRef.current?.reset();
                }}
              />
              {canFullscreen &&
                (fullscreen ? (
                  <PictureButton
                    label="Vollbild beenden"
                    icon={Minimize}
                    onClick={exitFullscreen}
                  />
                ) : (
                  <PictureButton label="Vollbild" icon={Maximize} onClick={enterFullscreen} />
                ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Halte die Maustaste gedrückt, dann zieht die Maus stärker.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {paramValues(display.params, attractor.symbols)
              .map(({ symbol, value }) => `${symbol} ${paramFormat.format(value)}`)
              .join(" · ")}
            {` · Kraft ${strengthFormat.format(display.strength)}`}
          </p>
        </>
      ) : (
        <Alert>
          <AlertTitle>Keine 3D-Grafik</AlertTitle>
          <AlertDescription>
            Dein Browser kann kein WebGL 2 zeigen. Bitte nutze einen aktuellen Chrome oder Edge und
            schalte die Hardwarebeschleunigung ein.
          </AlertDescription>
        </Alert>
      )}
      <Explanation attractor={attractor} />
    </main>
  );
}
