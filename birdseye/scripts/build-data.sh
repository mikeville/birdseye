#!/usr/bin/env bash
# Birdseye data pipeline — produces the static .pmtiles assets bundled at
# public/. Run this once at setup, and re-run only when you want fresher
# Protomaps OSM data or a different zoom/bbox tradeoff. The output ships
# with the app; the inputs are throwaway.
#
# Requirements:
#   brew install pmtiles            # https://github.com/protomaps/go-pmtiles
#   brew install gdal tippecanoe    # only needed for the contour pipeline
#
# Outputs:
#   public/basemap.pmtiles    # OSM basemap (Protomaps schema)
#   public/contours.pmtiles   # land contours (DEFERRED — see below)
#   public/bathymetry.pmtiles # sea contours (DEFERRED — see below)

set -euo pipefail

PUBLIC="$(cd "$(dirname "$0")/.." && pwd)/public"
mkdir -p "$PUBLIC"

# 1) Basemap — extract a global lat ±60° strip from the Protomaps daily build
#    via HTTP range requests. Output is small (tens of MB) and ships with the
#    app. Bump --maxzoom for crisper detail at low altitudes; expect roughly:
#      z6 → ~30 MB     (current default; chunky at altitudes < 100 km)
#      z7 → ~120 MB
#      z8 → ~480 MB    (matches BUILD_SPEC.md target; serves z12+ via overzoom)
SOURCE_URL="https://demo-bucket.protomaps.com/v4.pmtiles"
MAXZOOM="${BIRDSEYE_BASEMAP_MAXZOOM:-7}"

echo "==> Extracting basemap.pmtiles (lat ±60°, z0–${MAXZOOM}) from ${SOURCE_URL}"
pmtiles extract \
  "$SOURCE_URL" \
  "$PUBLIC/basemap.pmtiles" \
  --bbox=-180,-60,180,60 \
  --maxzoom="$MAXZOOM"

# 2) Land contours from SRTM 30m — DEFERRED to a separate session.
#    The pipeline is roughly:
#      a) Download SRTM 30m for the bbox (e.g. via the `elevation` CLI or AWS
#         Open Data terrain tiles — much smaller than raw SRTM tiles).
#      b) gdal_contour -i 100 -snodata 0 -a height input.tif contours.geojson
#      c) tippecanoe -z8 -o public/contours.pmtiles -l contours \
#           --drop-densest-as-needed contours.geojson
#    Output target: ~30–80 MB. Filter intervals per zoom to keep low-zoom
#    layers from being too dense.

# 3) Bathymetric contours from GEBCO — same pipeline as land contours, applied
#    to GEBCO global bathymetry NetCDF. Lighter colors / lower opacity in style.

ls -lh "$PUBLIC"/*.pmtiles
