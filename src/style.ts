// Build the MapLibre style JSON for Birdseye.
//
// Approach:
//   1. Take the Protomaps "white" flavor non-label layers as a starting point.
//   2. Drop everything but earth + water polygons (no buildings, POIs,
//      landuse, etc.). The map should read like a blank topographic sheet
//      at high altitudes.
//   3. Recolor: paper-warm background everywhere; water = background (no
//      fill contrast — coastlines do the work).
//   4. Layer back in zoom-tiered detail so the map becomes recognizable as
//      altitude drops below ~500 km without overwhelming high-altitude
//      views with inherited detail. Each new layer has an explicit
//      `minzoom` so it stays out of higher altitudes:
//        z3+:  country admin lines (subtle dashed)
//        z3.5+: region (state/province) labels
//        z5+:  rivers (line), city/locality labels
//        z6+:  river name labels, landmark labels
//        z9+:  major roads (motorway/trunk only, dashed)
//   5. Add a curated landmarks GeoJSON overlay for ~50 globally
//      recognizable places (Stonehenge, Mt. Fuji, etc.) — Protomaps' POIs
//      are too noisy to filter to "globally recognizable", so we ship a
//      hand-curated source instead.
//
// Schema reference (verified against @protomaps/basemaps@4.x white flavor):
//   - boundaries.kind_detail: 1–2 country, 3–4 state/region
//   - water.kind: river / stream (line); lake / water / ocean / sea (poly)
//   - roads.kind: highway / major_road / minor_road / other
//   - places.kind: country / region / locality / neighbourhood

import { layers as basemapsLayers, namedFlavor } from '@protomaps/basemaps';
import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';

// Paper background, soft black for marks. Slightly warm of pure black.
// Used as defaults — runtime overrides flow through StyleOptions.colors so
// the dev color panel can rebuild the style with different values without
// touching source.
export const PAPER = '#f4eee0';
export const INK = '#2a2520';

export type Colors = { paper: string; ink: string };
export const DEFAULT_COLORS: Colors = { paper: PAPER, ink: INK };

// Default fontstack — Protomaps' free-tier glyphs CDN. The italic-serif
// substitution is deferred to the polish pass (BUILD_SPEC open question #2),
// so for now we use Noto Sans Italic available in Protomaps' fontstack.
const GLYPHS_URL =
  'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';
const ITALIC_FONT = ['Noto Sans Italic'];

// PMTiles archive bundled at public/basemap.pmtiles. Same-origin → no CORS
// concerns, no proxy. Currently extracted at lat ±60°, z0–7 from the
// Protomaps daily build (run scripts/build-data.sh to regenerate / bump
// zoom). Override at build time via VITE_PMTILES_URL if you swap sources.
const DEFAULT_PMTILES_URL =
  import.meta.env.VITE_PMTILES_URL ?? '/basemap.pmtiles';

// MapLibre's pmtiles:// protocol expects an absolute URL. Resolve relatives
// against the page origin at runtime so the dev proxy and production-bundled
// asset both work without a config change.
const resolveUrl = (u: string): string =>
  /^[a-z]+:\/\//i.test(u) ? u : new URL(u, window.location.origin).toString();

const SOURCE_NAME = 'protomaps';
const LANDMARKS_SOURCE = 'landmarks';

// Layer ids from @protomaps/basemaps to KEEP from the base flavor. Everything
// else is dropped; the recognizability detail (rivers, roads, places,
// boundaries) is added back below as bespoke definitions so we have full
// control of the styling.
const KEEP_LAYER_IDS = new Set<string>(['background', 'earth', 'water']);

// Coalesce English label first, fall back to the native `name` if not
// present. Reused by every symbol layer so labels are consistent.
const NAME_FIELD: maplibregl.ExpressionSpecification = [
  'coalesce',
  ['get', 'name:en'],
  ['get', 'name'],
] as unknown as maplibregl.ExpressionSpecification;

export type StyleOptions = {
  pmtilesUrl?: string;
  colors?: Partial<Colors>;
};

export const buildStyle = (options: StyleOptions = {}): StyleSpecification => {
  const url = resolveUrl(options.pmtilesUrl ?? DEFAULT_PMTILES_URL);
  const paper = options.colors?.paper ?? PAPER;
  const ink = options.colors?.ink ?? INK;
  const flavor = namedFlavor('white');

  // Build the base, then aggressively prune. The cast bridges a slight
  // version mismatch between @protomaps/basemaps' bundled style spec and
  // maplibre-gl@5's — the structural types are equivalent.
  const baseLayers = (basemapsLayers(SOURCE_NAME, flavor) as unknown as LayerSpecification[])
    .filter((l) => KEEP_LAYER_IDS.has(l.id))
    .map((l) => {
      if (l.id === 'background' && l.type === 'background') {
        return {
          ...l,
          paint: { ...l.paint, 'background-color': paper },
        };
      }
      if (l.id === 'earth' && l.type === 'fill') {
        return {
          ...l,
          paint: { ...l.paint, 'fill-color': paper },
        };
      }
      if (l.id === 'water' && l.type === 'fill') {
        return {
          ...l,
          paint: { ...l.paint, 'fill-color': paper },
        };
      }
      return l;
    });

  // Country admin lines — subtle dashed, just enough to suggest where one
  // country ends and another begins. kind_detail<=2 selects country borders
  // only (3+ is state/province, which we omit for the paper aesthetic).
  const boundariesCountry: LayerSpecification = {
    id: 'boundaries_country',
    type: 'line',
    source: SOURCE_NAME,
    'source-layer': 'boundaries',
    minzoom: 3,
    filter: ['<=', ['get', 'kind_detail'], 2],
    paint: {
      'line-color': ink,
      'line-width': 0.5,
      'line-dasharray': [2, 3],
      'line-opacity': 0.4,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  };

  // Major rivers (line geometry). Protomaps' default `water_river` layer
  // has minzoom:9 — we override to z5 so rivers appear as altitude drops
  // below ~1000 km. They're still kept thin and translucent.
  const rivers: LayerSpecification = {
    id: 'rivers',
    type: 'line',
    source: SOURCE_NAME,
    'source-layer': 'water',
    minzoom: 5,
    filter: ['==', ['get', 'kind'], 'river'],
    paint: {
      'line-color': ink,
      'line-width': 0.6,
      'line-opacity': 0.5,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  };

  // Dashed coastline at high altitude only — fades out as the form-line
  // hachure stack fades in (~z6–7). Below z6 the hachures aren't worth
  // rendering (tile-clip artifacts at polygon edges become visible and
  // the offset density gets noisy at world scale), so the dashed line
  // carries the global view.
  const coastlineDashed: LayerSpecification = {
    id: 'coastline_dashed',
    type: 'line',
    source: SOURCE_NAME,
    'source-layer': 'water',
    maxzoom: 7,
    filter: ['all',
      ['!=', ['get', 'kind'], 'river'],
      ['!=', ['get', 'kind'], 'stream'],
    ],
    paint: {
      'line-color': ink,
      'line-width': 1,
      'line-dasharray': [1, 2],
      'line-opacity': [
        'interpolate', ['linear'], ['zoom'],
        5.5, 0.85,
        7, 0,
      ],
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  };

  // Form-line / sea-hachure stack. Renders the water polygon outline
  // multiple times at increasing pixel offsets with tapering opacity.
  // Polygon winding (MVT spec: outer rings CW, holes CCW) means a
  // positive line-offset lands on the water side for both:
  //   - islands (the shoreline is a hole in the ocean polygon, CCW →
  //     positive offset goes outward from land into ocean)
  //   - lakes (outer ring CW → positive offset goes inward into the
  //     lake)
  // The river/stream filter is required because the same source-layer
  // contains line geometry that, if outlined here, produces a hachure
  // ladder along one bank that looks broken.
  //
  // If you ever need to flip direction (engine update, tile re-encode
  // with different winding), just negate the offsets.
  const HACHURE_STEPS = [
    { offset: 0,    width: 0.85, opacity: 0.95 },
    { offset: 1.6,  width: 0.55, opacity: 0.55 },
    { offset: 3.6,  width: 0.5,  opacity: 0.40 },
    { offset: 6,    width: 0.5,  opacity: 0.30 },
    { offset: 9,    width: 0.45, opacity: 0.22 },
    { offset: 13,   width: 0.45, opacity: 0.16 },
    { offset: 18,   width: 0.4,  opacity: 0.11 },
    { offset: 24,   width: 0.4,  opacity: 0.07 },
  ] as const;

  const hachures: LayerSpecification[] = HACHURE_STEPS.map((s, i) => ({
    id: `coastline_hachure_${i}`,
    type: 'line',
    source: SOURCE_NAME,
    'source-layer': 'water',
    minzoom: 6,
    filter: ['all',
      ['!=', ['get', 'kind'], 'river'],
      ['!=', ['get', 'kind'], 'stream'],
    ],
    paint: {
      'line-color': ink,
      'line-width': s.width,
      'line-offset': s.offset,
      'line-opacity': [
        'interpolate', ['linear'], ['zoom'],
        5.5, 0,
        6.5, s.opacity,
      ],
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  }));

  // Major roads only — motorway-class (kind=highway) and trunk/primary
  // (kind=major_road). Skipped tunnels and bridges/links to keep the line
  // density honest. Visible only at z9+ (~50 km altitude and below) so
  // higher-altitude views remain road-free.
  const roadsMajor: LayerSpecification = {
    id: 'roads_major',
    type: 'line',
    source: SOURCE_NAME,
    'source-layer': 'roads',
    minzoom: 9,
    filter: [
      'all',
      ['!', ['has', 'is_tunnel']],
      ['!', ['has', 'is_bridge']],
      ['in', ['get', 'kind'], ['literal', ['highway', 'major_road']]],
    ],
    paint: {
      'line-color': ink,
      'line-width': 0.5,
      'line-dasharray': [3, 2],
      'line-opacity': 0.45,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  };

  // Country labels at low zoom only. Italic serif, soft black. Existing
  // behavior — kept unchanged for continuity.
  const placesCountry: LayerSpecification = {
    id: 'places_country',
    type: 'symbol',
    source: SOURCE_NAME,
    'source-layer': 'places',
    minzoom: 0,
    maxzoom: 4.5,
    filter: ['==', ['get', 'kind'], 'country'],
    layout: {
      'text-field': NAME_FIELD,
      'text-font': ITALIC_FONT,
      'text-size': 11,
      'text-letter-spacing': 0.06,
      'text-transform': 'uppercase',
      'text-max-width': 6,
      'text-padding': 4,
    },
    paint: {
      'text-color': ink,
      'text-opacity': 0.75,
      'text-halo-color': paper,
      'text-halo-width': 1.2,
    },
  };

  // Region (state/province) labels at mid zoom. Smaller, less assertive
  // than country labels.
  const placesRegion: LayerSpecification = {
    id: 'places_region',
    type: 'symbol',
    source: SOURCE_NAME,
    'source-layer': 'places',
    minzoom: 3.5,
    maxzoom: 7,
    filter: ['==', ['get', 'kind'], 'region'],
    layout: {
      'text-field': NAME_FIELD,
      'text-font': ITALIC_FONT,
      'text-size': 9,
      'text-letter-spacing': 0.04,
      'text-transform': 'uppercase',
      'text-max-width': 6,
      'text-padding': 4,
    },
    paint: {
      'text-color': ink,
      'text-opacity': 0.5,
      'text-halo-color': paper,
      'text-halo-width': 1,
    },
  };

  // City + town labels (kind=locality). Each feature has population_rank
  // (lower = more important: ~8 = mega-city, ~13 = small town) and
  // min_zoom. We use sort_key so the most important labels win when
  // they collide, and we let the population_rank filter prune small
  // towns until we're zoomed in close.
  const placesLocality: LayerSpecification = {
    id: 'places_locality',
    type: 'symbol',
    source: SOURCE_NAME,
    'source-layer': 'places',
    minzoom: 5,
    filter: [
      'all',
      ['==', ['get', 'kind'], 'locality'],
      // At z5–7 only show major cities (rank<11); at z7+ rank<13;
      // at z9+ everything that has a min_zoom <= zoom (Protomaps' own hint).
      [
        'any',
        ['all', ['<', ['zoom'], 7], ['<', ['get', 'population_rank'], 11]],
        ['all', ['>=', ['zoom'], 7], ['<', ['zoom'], 9], ['<', ['get', 'population_rank'], 13]],
        ['>=', ['zoom'], 9],
      ],
    ] as unknown as maplibregl.FilterSpecification,
    layout: {
      'text-field': NAME_FIELD,
      'text-font': ITALIC_FONT,
      'symbol-sort-key': ['get', 'min_zoom'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 9,
        8, 11,
        12, 13,
      ],
      'text-letter-spacing': 0.02,
      'text-max-width': 7,
      'text-padding': 4,
      'text-anchor': 'center',
    },
    paint: {
      'text-color': ink,
      'text-opacity': 0.8,
      'text-halo-color': paper,
      'text-halo-width': 1.2,
    },
  };

  // River name labels — Protomaps' built-in `min_zoom` per feature handles
  // importance ranking, so we don't need to maintain an allowlist of
  // famous rivers. Only label at z6+ so high-altitude views stay clean.
  const riversLabel: LayerSpecification = {
    id: 'rivers_label',
    type: 'symbol',
    source: SOURCE_NAME,
    'source-layer': 'water',
    minzoom: 6,
    filter: ['==', ['get', 'kind'], 'river'],
    layout: {
      'text-field': NAME_FIELD,
      'text-font': ITALIC_FONT,
      'text-size': 9,
      'text-letter-spacing': 0.04,
      'text-padding': 4,
      'symbol-placement': 'line',
    },
    paint: {
      'text-color': ink,
      'text-opacity': 0.55,
      'text-halo-color': paper,
      'text-halo-width': 1,
    },
  };

  // Hand-curated globally recognizable landmarks. Two layers from one
  // GeoJSON source: a small dot at z5+ (so you can see "there's something
  // here" before you get close enough for the label), and the label at z6+.
  const landmarksPoints: LayerSpecification = {
    id: 'landmarks_points',
    type: 'circle',
    source: LANDMARKS_SOURCE,
    minzoom: 5,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 1.2,
        9, 2.5,
        14, 4,
      ],
      'circle-color': ink,
      'circle-opacity': 0.7,
    },
  };

  const landmarksLabels: LayerSpecification = {
    id: 'landmarks_labels',
    type: 'symbol',
    source: LANDMARKS_SOURCE,
    minzoom: 6,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ITALIC_FONT,
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, 9,
        10, 11,
        14, 13,
      ],
      'text-anchor': 'top',
      'text-offset': [0, 0.6],
      'text-letter-spacing': 0.02,
      'text-max-width': 8,
      'text-padding': 4,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': ink,
      'text-opacity': 0.85,
      'text-halo-color': paper,
      'text-halo-width': 1.4,
    },
  };

  // Layer order matters in MapLibre: later in the array = painted on top.
  // Fills first (water, earth) → lines (boundaries, rivers, coastline,
  // roads) → symbols (places by tier, river labels, landmarks).
  const style: StyleSpecification = {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [SOURCE_NAME]: {
        type: 'vector',
        url: `pmtiles://${url}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
      [LANDMARKS_SOURCE]: {
        type: 'geojson',
        data: '/landmarks.geojson',
      },
    },
    layers: [
      ...baseLayers,
      boundariesCountry,
      rivers,
      coastlineDashed,
      ...hachures,
      roadsMajor,
      placesCountry,
      placesRegion,
      placesLocality,
      riversLabel,
      landmarksPoints,
      landmarksLabels,
    ],
  };

  return style;
};
