import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { tokens } from "../generated/tokens";
import { Guidelines } from "./parts";

const palette = [
  { label: "Ivory · fondo superior", value: tokens.color.light.background },
  { label: "Taupe · fondo inferior", value: tokens.color.light.secondary },
  { label: "Carbón · texto principal", value: tokens.color.light.foreground },
  { label: "Gris cálido · texto secundario", value: tokens.color.light.mutedForeground },
  { label: "Oro antiguo · detalle", value: tokens.color.light.chart1 },
  { label: "Arena · luz ambiental", value: tokens.color.light.chart3 },
  { label: "Oro suave · luz ambiental", value: tokens.color.light.chart4 },
  { label: "Salvia · luz ambiental", value: tokens.color.light.chart2 },
];

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div
        className="h-16 rounded-xl border border-border/60"
        style={{ backgroundColor: value }}
      />
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-medium">{label}</span>
        <code className="text-xs text-muted-foreground">{value}</code>
      </div>
    </div>
  );
}

function HomeMoodPreview() {
  return (
    <section
      aria-label="Vista de ejemplo del inicio de Outfit"
      className="relative isolate min-h-[390px] overflow-hidden rounded-[24px] border border-border/60 p-7 shadow-sm sm:p-10"
      style={{
        backgroundImage:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-10 -z-10 size-56 rounded-full bg-chart-3/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-16 right-0 -z-10 size-56 rounded-full bg-chart-4/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-14 right-5 -z-10 size-52 rounded-full bg-chart-2/45 blur-3xl"
      />

      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}outfit-mark.jpeg`}
          alt=""
          className="size-11 rounded-xl object-cover shadow-sm"
        />
        <div>
          <p className="text-sm font-semibold">Outfit</p>
          <p className="text-xs text-muted-foreground">Tu estilo, cada día</p>
        </div>
      </div>

      <div className="mt-12 max-w-lg">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Miércoles, 14 de octubre
        </p>
        <h2 className="mt-4 font-serif text-5xl leading-[0.98] tracking-tight text-foreground sm:text-6xl">
          Hola, Daniela
        </h2>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          09:41 <span className="px-2 text-chart-1">·</span> 22° Despejado
        </p>
      </div>

      <div className="mt-9 max-w-md rounded-full border border-white/70 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <Button className="w-full justify-between px-6">
          <span>¿Cuál es el plan de hoy?</span>
          <ArrowRight aria-hidden="true" className="text-accent" />
        </Button>
      </div>

      <div className="mt-4 inline-flex items-center rounded-full border border-white/70 bg-white/30 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-xl">
        La luz suave y el cristal dejan respirar el contenido
      </div>
    </section>
  );
}

export function OutfitOverviewPage() {
  return (
    <div className="space-y-6">
      <HomeMoodPreview />
      <section className="rounded-2xl border bg-card p-5 text-card-foreground sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold">Paleta esencial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tonos cálidos y naturales de la experiencia Outfit.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.slice(0, 4).map((color) => (
            <Swatch key={color.label} {...color} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function BrandPage() {
  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground">
      <section className="flex flex-wrap items-center gap-6">
        <img
          src={`${import.meta.env.BASE_URL}outfit-mark.jpeg`}
          alt="Icono de Outfit: un espejo con destellos"
          className="size-32 rounded-[24px] object-cover shadow-sm"
        />
        <div className="max-w-lg">
          <h2 className="font-serif text-4xl">Un momento para ti</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            El icono de espejo y destellos es el recurso de marca compartido.
            Mantén su imagen original; no reconstruyas ni alteres el símbolo.
          </p>
        </div>
      </section>
      <div className="rounded-2xl border bg-muted/60 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Uso del logotipo
        </p>
        <p className="mt-2 text-sm leading-6">
          Conserva el fondo crema, la ilustración marrón y su forma cuadrada
          redondeada. No lo coloques sobre un fondo de bajo contraste ni añadas
          texto encima del símbolo.
        </p>
      </div>
    </div>
  );
}

export function OutfitColorsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Colores de Outfit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El fondo principal transita del marfil al taupe. Oro, arena y salvia
          aparecen como acentos de baja intensidad.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map((color) => (
            <Swatch key={color.label} {...color} />
          ))}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Modos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El modo claro conserva los colores especificados. El oscuro deriva
          fondos y superficies del carbón y gris cálido para mantener contraste
          sin introducir una paleta de marca paralela.
        </p>
      </section>
    </div>
  );
}

const TYPE_SAMPLES = [
  { label: "Titular", className: "font-serif text-5xl leading-none", family: "Melodrama Medium · 500" },
  { label: "Texto", className: "text-lg font-normal", family: "Satoshi · 400" },
  { label: "Énfasis", className: "text-base font-medium", family: "Satoshi · 500" },
  { label: "Acción", className: "text-sm font-bold", family: "Satoshi · 700" },
];

export function OutfitFontsPage() {
  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tipografía
        </p>
        <h2 className="mt-4 font-serif text-5xl leading-none">Hola, Daniela</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Satoshi mantiene la interfaz cercana y legible. Melodrama Medium se
          reserva para titulares grandes con carácter editorial.
        </p>
      </div>
      <div className="space-y-5 border-t pt-5">
        {TYPE_SAMPLES.map((sample) => (
          <div
            key={sample.label}
            className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_180px] sm:items-baseline"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {sample.label}
            </span>
            <p className={sample.className}>¿Cuál es el plan de hoy?</p>
            <span className="text-xs text-muted-foreground">{sample.family}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OutfitLayoutPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 text-card-foreground">
          <h2 className="font-semibold">Espaciado y forma</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Base de espaciado: 4 px</li>
            <li>Margen horizontal de pantalla: 24 px</li>
            <li>Radio de tarjeta: 24 px</li>
            <li>Control tipo píldora: 999 px</li>
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-card-foreground">
          <h2 className="font-semibold">Superficies de cristal</h2>
          <div className="mt-4 rounded-2xl border border-white/70 bg-gradient-to-br from-white/35 to-white/10 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
            <p className="font-medium">Transparente, nunca opaca</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El color del fondo debe seguir visible a través del cristal.
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            En la app nativa: desenfoque 45, borde blanco al 70%, degradado
            blanco 32% → 6% y sombra negra al 8%. Android usa blanco al 35% si
            no puede desenfocar.
          </p>
        </div>
      </section>
      <Guidelines
        items={[
          { kind: "do", text: "Mantén visibles los colores ambientales detrás de las superficies de cristal." },
          { kind: "do", text: "Usa 24 px como margen horizontal de pantalla y como radio de tarjeta." },
          { kind: "dont", text: "No conviertas el cristal en una superficie mate u opaca." },
        ]}
      />
    </div>
  );
}

export function OutfitContentPage() {
  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="font-semibold">Voz y contenido</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          La app habla siempre en español. Saluda de forma personal, breve y
          natural; usa las etiquetas de interfaz que proporcione el producto
          exactamente como están escritas.
        </p>
      </section>
      <div className="rounded-2xl bg-muted/60 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Texto aprobado
        </p>
        <p className="mt-3 font-serif text-3xl">Hola, Daniela</p>
        <p className="mt-2 text-sm">¿Cuál es el plan de hoy?</p>
      </div>
      <Guidelines
        items={[
          { kind: "do", text: "Escribe todos los textos visibles de la app en español." },
          { kind: "do", text: "Conserva literalmente las cadenas de interfaz entrecomilladas en el brief del producto." },
          { kind: "dont", text: "No sustituyas las cadenas aprobadas por traducciones o paráfrasis." },
        ]}
      />
    </div>
  );
}

export function OutfitMotionPage() {
  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="font-semibold">Movimiento y respuesta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La respuesta visual debe sentirse suave y mantener el foco en el
          contenido, nunca saltar bruscamente entre estados.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Resorte", "Damping 20 · stiffness 220 · mass 1"],
          ["Fundido", "250 ms"],
          ["Pulsación", "Escala 0,97 mientras se mantiene la presión"],
          ["Entrada de pantalla", "Fundido + desplazamiento vertical de 12 pt"],
        ].map(([name, value]) => (
          <div key={name} className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Los patrones de hápticos nativos son toque ligero, selección y éxito;
        cada llamada se protege con try/catch.
      </p>
    </div>
  );
}

export function OutfitAppliedExamplePage() {
  return (
    <div className="space-y-6">
      <HomeMoodPreview />
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Ejemplo de composición basado en la pantalla de inicio de Figma. No
        incluye marco ni controles simulados del dispositivo; el sistema
        operativo los dibuja en el dispositivo real.
      </p>
    </div>
  );
}
