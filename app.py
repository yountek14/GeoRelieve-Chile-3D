import os
import math
import json
import urllib.request

import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from osgeo import gdal

gdal.UseExceptions()

BASE = os.path.dirname(os.path.abspath(__file__))
TILES_DIR = os.path.join(BASE, "data", "tiles")
STATIC_DIR = os.path.join(BASE, "static")
CATALOG_FILE = os.path.join(BASE, "catalog.json")
S3_BASE = "https://copernicus-dem-30m.s3.amazonaws.com"

M_PER_DEG_LAT = 110540.0

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")


# ----------------------------------------------------------------------
# Nombres y descarga de tiles Copernicus DEM GLO-30 (1x1 grado)
# ----------------------------------------------------------------------
def tile_name_from_floors(tlat, tlon):
    """Nombre del tile dado el piso de lat/lon (ej. -42, -73)."""
    lat_part = f"S{abs(tlat):02d}_00"
    lon_part = f"W{abs(tlon):03d}_00"
    return f"Copernicus_DSM_COG_10_{lat_part}_{lon_part}_DEM"


def ensure_tile(tlat, tlon):
    """Descarga el tile si hace falta. Devuelve ruta local."""
    name = tile_name_from_floors(tlat, tlon)
    dest = os.path.join(TILES_DIR, name + ".tif")
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return dest

    url = f"{S3_BASE}/{name}/{name}.tif"
    tmp = dest + ".part"
    os.makedirs(TILES_DIR, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "chile-3d/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(tmp, dest)
    return dest


# ----------------------------------------------------------------------
# Procesamiento del DEM con mosaico de tiles
# ----------------------------------------------------------------------
def build_vrt(paths):
    """Crea un VRT temporal que une varios tiles (mosaico)."""
    vrt_path = os.path.join(TILES_DIR, "_mosaic.vrt")
    if os.path.exists(vrt_path):
        try:
            os.remove(vrt_path)
        except OSError:
            pass
    gdal.BuildVRT(vrt_path, paths)
    return vrt_path


def _hillshade(arr, dx_m, dy_m, azimuth=315.0, altitude=45.0):
    """Sombreado de relieve 0-255 a partir de un DEM 2D (NaN = neutro)."""
    azi = math.radians(azimuth)
    alt = math.radians(altitude)
    zen = math.pi / 2.0 - alt
    mask = np.isnan(arr)
    a = np.where(mask, 0.0, arr)
    grad_y, grad_x = np.gradient(a)
    dzdx = grad_x / dx_m
    dzdy = grad_y / dy_m
    slope = np.arctan(np.sqrt(dzdx ** 2 + dzdy ** 2))
    aspect = np.arctan2(dzdy, -dzdx)
    shaded = np.cos(zen) * np.cos(slope) + np.sin(zen) * np.sin(slope) * np.cos(azi - aspect)
    hs = np.clip(shaded, 0.0, 1.0) * 255.0
    hs = np.where(mask, 255.0, hs)
    return hs


def process_terrain(lat, lon, size_km, target=800):
    half_km = size_km / 2.0
    half_lat = (half_km * 1000.0) / M_PER_DEG_LAT
    m_per_deg_lon = 111320.0 * math.cos(math.radians(lat))
    half_lon = (half_km * 1000.0) / m_per_deg_lon

    W = lon - half_lon
    E = lon + half_lon
    S = lat - half_lat
    N = lat + half_lat

    lat0 = math.floor(S)
    lat1 = math.floor(N)
    lon0 = math.floor(W)
    lon1 = math.floor(E)

    paths = []
    for tlat in range(lat0, lat1 + 1):
        for tlon in range(lon0, lon1 + 1):
            paths.append(ensure_tile(tlat, tlon))

    src = paths[0] if len(paths) == 1 else build_vrt(paths)

    ds = gdal.Open(src)
    gt = ds.GetGeoTransform()
    xmin, dx, _, ymax, _, dy_gt = gt

    col0 = int((W - xmin) / dx)
    col1 = int((E - xmin) / dx) + 1
    row_n = int((N - ymax) / dy_gt)
    row_s = int((S - ymax) / dy_gt) + 1

    col0 = max(0, min(col0, ds.RasterXSize))
    col1 = max(0, min(col1, ds.RasterXSize))
    row_n = max(0, min(row_n, ds.RasterYSize))
    row_s = max(0, min(row_s, ds.RasterYSize))

    if col1 <= col0 or row_s <= row_n:
        return None

    sub = ds.ReadAsArray(col0, row_n, col1 - col0, row_s - row_n).astype(np.float32)
    ds = None

    step = max(1, math.ceil(max(sub.shape) / float(target)))
    sub_s = sub[::step, ::step]
    Hs, Ws = sub_s.shape

    sub_s = np.where(sub_s <= 0, np.nan, sub_s)
    sub_s = np.where(sub_s < -100, np.nan, sub_s)

    zmin = float(np.nanmin(sub_s))
    zmax = float(np.nanmax(sub_s))
    if not math.isfinite(zmin):
        zmin = 0.0
    if not math.isfinite(zmax):
        zmax = 1.0

    west = xmin + col0 * dx
    east = xmin + (col0 + (Ws - 1) * step) * dx
    north = ymax + row_n * dy_gt
    south = ymax + (row_n + (Hs - 1) * step) * dy_gt

    m_per_deg_lon = 111320.0 * math.cos(math.radians((north + south) / 2.0))
    width_m = (east - west) * m_per_deg_lon
    height_m = (north - south) * M_PER_DEG_LAT

    heights = [None if (not math.isfinite(float(v))) else round(float(v), 1)
               for v in sub_s.flatten().tolist()]

    # Hillshade (sombreado de relieve) para el visor
    hs_arr = _hillshade(sub_s, width_m / Ws, height_m / Hs)
    hillshade = [int(round(v)) for v in hs_arr.flatten().tolist()]

    return {
        "heights": heights,
        "hillshade": hillshade,
        "Ws": Ws,
        "Hs": Hs,
        "width_m": width_m,
        "height_m": height_m,
        "center_lat": lat,
        "center_lon": lon,
        "m_per_deg_lat": M_PER_DEG_LAT,
        "m_per_deg_lon": m_per_deg_lon,
        "west": west, "east": east, "south": south, "north": north,
        "zmin": zmin,
        "zmax": zmax,
    }


# ----------------------------------------------------------------------
# Rutas
# ----------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/api/catalog")
def catalog():
    with open(CATALOG_FILE, encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route("/api/terrain")
def terrain():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
    except (TypeError, ValueError):
        return jsonify({"error": "parametros lat/lon invalidos"}), 400

    size_km = float(request.args.get("size", 25))

    try:
        result = process_terrain(lat, lon, size_km)
        if result is None:
            return jsonify({"error": "area sin datos"}), 404
        return jsonify(result)
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("CHILE3D_PORT", "8765"))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
