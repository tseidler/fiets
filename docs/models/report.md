# Meetrapport: 3D-fietsmodellen voor Three.js-game

Gegenereerd: 2026-07-22  
Alle coördinaten zijn **Blender-wereldcoördinaten, Z-up** tenzij anders vermeld.  
Coördinaatconventies: X = rechts, Y = diepte/rijrichting, Z = omhoog.

---

## 1. MTB (Mountainbike)

**Bron:** `/assets/mountain_bike/OBJ/Mountain_Bike.obj` + `.mtl`  
**Output:** `/public/models/mtb.glb` — **9.37 MB** (9 828 192 bytes) ✓ < 10 MB  
**Pipeline:** Node.js-converter (Blender 5.2 crashte in headless-modus door Metal GPU-bug; zie §3).

### Coördinaat-conversie OBJ → Blender Z-up
Blender 2.79 OBJ-export (Forward=−Z, Up=Z→Y):
- Blender X = OBJ X
- Blender Y = −OBJ Z
- Blender Z = OBJ Y

### 1.1 Objecten na opschoning

Verwijderd: `Plane` (grondvlak, `col_tanah`) en `BezierCircle` (CURVE-hulpobject, 0 faces).

| Object | Blender-centrum (X, Y, Z) | Afmetingen (dX, dY, dZ) | Vertices | Materialen |
|---|---|---|---|---|
| pedal_kanan_Cube.000 | (0.866, −1.384, 1.472) | (0.434, 0.406, 0.184) | 2 472 | col_pelek |
| ban_depan_Torus | (0.014, 3.857, 2.463) | (0.685, 4.858, 4.858) | 34 936 | col_ban, uv_bn_depan, col_cakram, col_whel_or_rangka, col_pelek |
| stank_Cylinder.009 | (0.008, 2.644, 4.724) | (4.783, 2.990, 5.326) | 6 434 | col_pelek, col_rem, col_pegangan, col_shock |
| rangka_Cube.002 | (−0.008, −1.204, 4.481) | (1.230, 6.244, 4.403) | 23 557 | col_rangka, uv_rangka, col_pelek, col_ttp_btl, col_jok, col_jok_2 |
| gear_depan_…Circle.013 | (0.026, −1.378, 2.540) | (2.318, 1.110, 2.519) | 1 244 | col_pelek |
| ban_belakang_Torus.001 | (−0.018, −4.135, 2.463) | (0.631, 4.858, 4.858) | 37 063 | col_ban, uv_ban_belakang, col_cakram, col_whel_or_rangka, col_pelek |
| pedal_kiri_Cube.007 | (−0.815, −1.373, 3.647) | (0.434, 0.406, 0.184) | 2 472 | col_pelek |
| rantai_…Circle.020 | (0.394, −2.640, 2.545) | (0.316, 3.638, 1.139) | 133 280 | col_ttp_btl |

Totaal vertices: 241 458

### 1.2 Totale bbox (MTB, Blender Z-up)

| | X | Y | Z |
|---|---|---|---|
| Min | −2.383 | −6.564 | 0.034 |
| Max | 2.400 | 6.287 | 7.387 |
| Afmeting | 4.783 | 12.851 | 7.353 |

Wielonderkanten op Z ≈ 0.034 (grondniveau). Stuur-top op Z = 7.387.

### 1.3 Wielen (MTB)

| Wiel | Object | Centrum (X, Y, Z) | Buitendiameter |
|---|---|---|---|
| **Voorwiel** | ban_depan_Torus | (0.014, 3.857, 2.463) | **4.858** Blender-units |
| **Achterwiel** | ban_belakang_Torus.001 | (−0.018, −4.135, 2.463) | **4.858** Blender-units |

Beide wielen torus-achtig: twee gelijke grote afmetingen (4.858) + één kleine (0.631–0.685 = banddikte).  
Wielcentra op gelijke hoogte Z = 2.463 ≈ wielradius (4.858/2 = 2.429).

### 1.4 Frame (kleur-tinting, MTB)

| Object | Primair materiaal | Basiskleur (Kd) |
|---|---|---|
| **rangka_Cube.002** | **col_rangka** + **uv_rangka** (texture) | col_rangka: **(0.609, 0.640, 0.002)** = geel-groen/lime |

Voor kleur-tinting: pas `col_rangka` Kd aan in Three.js via `material.color.set(...)`.

### 1.5 Trapas-centrum en cranklengte (MTB)

- **Trapas** (gear_depan centrum, Blender): **(0.026, −1.378, 2.540)**
- **Pedal_kanan centrum** (Blender): **(0.866, −1.384, 1.472)**
- **Pedal_kiri centrum** (Blender): **(−0.815, −1.373, 3.647)**

**Cranklengte** (afstand trapas → pedal_kanan):  
√(0.840² + 0.006² + 1.068²) = √1.846 = **1.359 Blender-units**  
(pedal_kiri geeft 1.390; gemiddelde ≈ 1.374 — pedalen staan op verschillende crankoek)

### 1.6 Rijrichting (MTB)

Wielcentra-scheidingsas: **Y-as**.  
Voorwiel (ban_depan) op Y = +3.857 → **rijrichting: +Y** in Blender-coördinaten.

### 1.7 Y-up GLB-conversie (MTB)

**Ja.** Root node heeft quaternion (−0.7071, 0, 0, 0.7071) = −90° om X. Dit is standaard Blender Z-up → glTF Y-up. Texturen ingebed als base64-data-URI.

---

## 2. Racefiets

**Bron:** `/assets/road_bike` (Blender 2.82 .blend)  
**Output:** `/public/models/race.glb` — **10.64 MB** (11 159 248 bytes) ⚠️ licht boven 10 MB  
**Pipeline:** Blender 5.2 (gepatched binary, zie §3).

### 2.0 Volledige initiële objectenlijst (Blender 2.82, Z-up)

| Object | Type | Locatie (X, Y, Z) | Afmetingen (X, Y, Z) | Vertices | Materialen |
|---|---|---|---|---|---|
| alights.000 | MESH | (−15.340, 7.931, 2.251) | (3.879, 9.378, 0.000) | 4 | Studio Lights.005 |
| alights.001 | MESH | (8.631, 11.902, 8.400) | (11.810, 11.208, 0.000) | 4 | Studio Lights.004 |
| alights.014 | MESH | (−0.940, 26.134, 2.840) | (3.879, 9.378, 0.000) | 4 | Studio Lights.005 |
| alights.015 | MESH | (12.524, −11.077, 2.673) | (3.750, 19.736, 0.000) | 4 | Studio Lights.005 |
| Camera | CAMERA | (7.033, 5.392, −0.369) | — | — | — |
| Circle | MESH | (−0.005, −0.980, −0.405) | (1.325, 1.292, 0.035) | 704 | Material.001, Material.002 |
| Circle.002 | MESH | (−0.031, −0.982, −0.401) | (0.226, 0.226, 0.004) | 368 | Material.009 |
| Circle.003 | MESH | (0.058, −0.682, −0.522) | (0.412, 1.092, 0.088) | 445 | Material.006 |
| Circle.004 | MESH | (−0.005, 0.982, −0.405) | (1.325, 1.292, 0.035) | 704 | Material.001, Material.002 |
| Circle.005 | CURVE | (0.057, −0.682, −0.522) | (0.429, 1.110, 0.068) | — | — |
| Circle.006 | MESH | (−0.036, 0.980, −0.401) | (0.226, 0.226, 0.004) | 368 | Material.009 |
| Circle.007 | MESH | (0.057, −0.682, −0.825) | (9.240, 9.240, 0.000) | 120 | — |
| Cube | MESH | (0.000, 0.659, 0.362) | (0.138, 1.773, 1.190) | 1 882 | Material |
| Cube.001 | MESH | (0.000, −0.450, 0.407) | (0.042, 0.353, 1.024) | 351 | Material |
| Cube.002 | MESH | (0.000, 0.710, 0.320) | (0.151, 0.398, 0.718) | 208 | Material |
| Cube.003 | MESH | (0.000, −0.419, 0.459) | (0.048, 0.328, 0.558) | 162 | Material.001 |
| Cube.004 | MESH | (0.000, −0.758, 0.939) | (0.188, 0.529, 0.105) | 24 | Material.002 |
| Cube.005 | MESH | (0.000, 0.577, 0.601) | (0.061, 0.345, 0.132) | 272 | Material.003, Material.004 |
| Cube.006 | MESH | (0.084, −0.218, −0.530) | (0.311, 0.220, 0.019) | 52 | Material.006 |
| Cube.007 | MESH | (−0.001, 0.098, −0.145) | (0.104, 0.274, 0.081) | 192 | Material.004 |
| Cube.008 | MESH | (−0.001, −0.232, −0.177) | (0.104, 0.274, 0.081) | 192 | Material.004 |
| Cube.009 | MESH | (0.062, −0.997, −0.396) | (0.008, 0.037, 0.021) | 72 | — |
| Cube.010 | CURVE | (0.810, −0.468, −1.007) | (0.044, 0.308, 0.189) | — | — |
| Cube.011 | MESH | (0.375, 1.000, 0.653) | (0.053, 0.169, 0.225) | 1 281 | Material.010 |
| Cube.012 | MESH | (−0.375, 1.000, 0.653) | (0.053, 0.169, 0.225) | 1 281 | Material.010 |
| Cube.013 | MESH | (0.155, −0.117, −0.860) | (0.098, 0.076, 0.013) | 176 | Material.010 |
| Cube.014 | MESH | (0.000, 0.608, 0.565) | (0.075, 0.089, 0.031) | 296 | Material.001 |
| Cube.015 | MESH | (−0.064, −0.208, −0.556) | (0.319, 0.222, 0.019) | 112 | Material.006 |
| Cube.016 | MESH | (−0.138, −0.263, −0.228) | (0.098, 0.076, 0.013) | 176 | Material.010 |
| Cube.017 | MESH | (−0.091, 0.979, −0.403) | (0.034, 0.018, 0.056) | 88 | Material.001 |
| Cube.018 | MESH | (−0.091, −0.983, −0.403) | (0.034, 0.018, 0.056) | 88 | Material.001 |
| Cube.019 | CURVE | (0.822, 1.496, 0.018) | (0.273, 0.405, 0.149) | — | Material.002 |
| Cube.020 | CURVE | (0.822, 1.496, 0.001) | (0.272, 0.435, 0.151) | — | Material.007, Material.002 |
| Cube.021 | CURVE | (0.958, 0.968, 1.266) | (0.108, 0.960, 0.271) | — | Material.002 |
| Cube.022 | MESH | (−0.054, 0.916, −0.334) | (0.021, 0.071, 0.119) | 1 008 | Material.008, Material.001 |
| Cube.023 | MESH | (−0.052, −0.983, −0.294) | (0.021, 0.071, 0.119) | 1 008 | Material.008, Material.001 |
| Cube.024 | MESH | (0.058, −0.231, −0.294) | (0.038, 0.183, 0.100) | 72 | Material.004 |
| Cylinder | MESH | (0.000, −0.241, −0.322) | (0.062, 0.098, 0.019) | 70 | Material.004 |
| Cylinder.001 | MESH | (−0.000, 0.805, 0.677) | (0.233, 0.263, 0.826) | 2 336 | Material.001, Material.008 |
| Cylinder.022 | MESH | (−0.013, −1.139, −0.150) | (0.001, 0.001, 0.000) | 16 | — |
| Cylinder.023 | MESH | (−0.000, −0.837, −0.141) | (0.023, 1.101, 1.104) | 2 240 | Material.008 |
| Cylinder.037–088 | MESH | (diverse) | (diverse) | diverse | diverse |
| Empty.001 | EMPTY | (0.364, 0.019, −0.261) | — | — | — |
| Light | LIGHT | (1.831, −0.612, 1.693) | — | — | — |
| Plane | MESH | (−41.565, 129.528, −1.079) | (372.68, 351.76, 185.02) | 78 | Material.037, .038, .010 |

### 2.1 Objecten na opschoning

Verwijderd: Camera, Light, Empty, alle CURVEs (Circle.005, Cube.010/019/020/021), studio-lichten (alights.*, Circle.007 >5m), Plane (backdrop, max_dim 372m).

Na opschoning zijn modifiers applied (geen subsurf-modifier gevonden; geen decimatie nodig).

| Object | Centrum (X, Y, Z) | Afmetingen (dX, dY, dZ) | Vertices | Materialen |
|---|---|---|---|---|
| Circle | (0.003, −0.980, −0.405) | (0.035, 1.290, 1.323) | 10 880 | Material.001, .002 |
| Circle.002 | (−0.030, −0.982, −0.401) | (0.004, 0.226, 0.226) | 368 | Material.009 |
| Circle.003 ⚠️ | (0.062, −0.701, −1.970) | (0.068, 0.036, 2.937) | 63 190 | Material.006 |
| Circle.004 | (0.003, 0.982, −0.405) | (0.035, 1.290, 1.323) | 10 880 | Material.001, .002 |
| Circle.006 | (−0.035, 0.980, −0.401) | (0.004, 0.226, 0.226) | 368 | Material.009 |
| Cube | (0.000, −0.157, −0.002) | (0.138, 1.773, 1.190) | 3 584 | Material |
| Cube.001 | (−0.000, −0.329, 0.011) | (0.042, 0.353, 1.024) | 658 | Material |
| Cube.002 | (−0.000, 0.813, −0.068) | (0.151, 0.398, 0.718) | 395 | Material |
| Cube.003 | (0.000, −0.565, 0.658) | (0.048, 0.328, 0.558) | 319 | Material.001 |
| Cube.004 | (0.000, −0.619, 0.927) | (0.178, 0.515, 0.102) | 146 | Material.002 |
| Cube.005 | (0.000, 0.679, 0.624) | (0.061, 0.345, 0.132) | 499 | Material.003, .004 |
| Cube.006 | (0.081, −0.155, −0.701) | (0.034, 0.308, 0.366) | 52 | Material.006 |
| Cube.007 | (−0.001, 0.120, −0.063) | (0.105, 0.242, 0.259) | 192 | Material.004 |
| Cube.008 | (−0.006, −0.215, −0.094) | (0.117, 0.162, 0.288) | 192 | Material.004 |
| Cube.009 | (0.062, −1.000, −0.401) | (0.008, 0.035, 0.042) | 72 | — |
| Cube.011 | (0.375, 1.042, 0.620) | (0.053, 0.169, 0.225) | 1 281 | Material.010 |
| Cube.012 | (−0.375, 1.042, 0.620) | (0.053, 0.169, 0.225) | 1 281 | Material.010 |
| Cube.013 | (0.156, −0.117, −0.860) | (0.098, 0.073, 0.048) | 176 | Material.010 |
| Cube.014 | (0.000, 0.608, 0.565) | (0.075, 0.089, 0.031) | 296 | Material.001 |
| Cube.015 | (−0.062, −0.227, −0.379) | (0.034, 0.383, 0.382) | 112 | Material.006 |
| Cube.016 | (−0.139, −0.263, −0.228) | (0.098, 0.076, 0.039) | 176 | Material.010 |
| Cube.017 | (−0.089, 0.979, −0.422) | (0.056, 0.018, 0.065) | 88 | Material.001 |
| Cube.018 | (−0.089, −0.983, −0.422) | (0.056, 0.018, 0.065) | 88 | Material.001 |
| Cube.022 | (−0.053, 0.891, −0.347) | (0.027, 0.118, 0.138) | 1 008 | Material.008, .001 |
| Cube.023 | (−0.050, −1.006, −0.276) | (0.027, 0.130, 0.138) | 1 008 | Material.008, .001 |
| Cube.024 | (0.058, −0.296, −0.331) | (0.038, 0.183, 0.100) | 72 | Material.004 |
| Cylinder | (0.009, −0.241, −0.322) | (0.062, 0.099, 0.044) | 70 | Material.004 |
| Cylinder.001 | (0.000, 0.898, 0.571) | (0.826, 0.233, 0.263) | 4 640 | Material.001, .008 |
| Cylinder.022 | (−0.008, −0.951, −0.411) | (0.001, 0.001, 0.000) | 16 | — |
| Cylinder.023 | (0.001, −0.983, −0.406) | (0.023, 1.554, 1.555) | 2 240 | Material.008 |
| Cylinder.037 | (−0.001, −0.983, −0.404) | (0.094, 0.090, 0.090) | 704 | Material.006 |
| Cylinder.038 | (0.026, −0.982, −0.403) | (0.018, 0.166, 0.166) | 960 | Material.005, .009 |
| Cylinder.039 | (0.067, −0.190, −0.543) | (0.026, 0.404, 0.403) | 498 | Material.004, .006 |
| Cylinder.040 | (0.009, −0.187, −0.544) | (0.120, 0.047, 0.048) | 82 | Material.004 |
| Cylinder.041 | (−0.001, 0.111, −0.059) | (0.094, 0.235, 0.248) | 768 | Material.011, .012 |
| Cylinder.042 | (0.073, −0.983, −0.402) | (0.050, 0.034, 0.034) | 248 | Material.001 |
| Cylinder.043 | (0.062, −1.001, −0.441) | (0.009, 0.027, 0.057) | 80 | Material.008 |
| Cylinder.044 | (0.101, −0.117, −0.860) | (0.029, 0.009, 0.009) | 160 | Material.010 |
| Cylinder.045 | (0.093, −0.965, −0.595) | (0.062, 0.338, 0.358) | 1 320 | Material.004, .006, .001 |
| Cylinder.046 | (−0.070, −0.983, −0.402) | (0.050, 0.034, 0.034) | 248 | Material.001 |
| Cylinder.075 | (0.001, 0.982, −0.405) | (0.023, 1.478, 1.477) | 2 240 | Material.008 |
| Cylinder.082 | (0.073, 0.979, −0.402) | (0.050, 0.034, 0.034) | 248 | Material.001 |
| Cylinder.083 | (−0.070, 0.979, −0.402) | (0.050, 0.034, 0.034) | 248 | Material.001 |
| Cylinder.084 | (−0.001, 0.977, −0.402) | (0.098, 0.093, 0.093) | 704 | Material.006 |
| Cylinder.085 | (−0.080, −0.263, −0.228) | (0.035, 0.009, 0.009) | 160 | Material.010 |
| Cylinder.086 | (−0.000, 0.681, 0.277) | (0.046, 0.058, 0.058) | 64 | Material.001 |
| Cylinder.087 | (0.003, 0.979, −0.882) | (0.012, 0.010, 0.060) | 312 | Material.001 |
| Cylinder.088 | (0.003, −1.377, −0.676) | (0.012, 0.053, 0.045) | 312 | Material.001 |

⚠️ **Circle.003**: Na modifier-apply zijn de afmetingen drastisch veranderd (0.088→2.937 in Z). Dit object had een Curve-modifier die refereerde aan `Circle.005` (CURVE, verwijderd als niet-fietsgeometrie). Na verwijdering is de modifier incorrect applied; de mesh is abnormaal uitgerekt. Dit beïnvloedt Z_min van de totale bbox.

### 2.2 Totale bbox (racefiets, Blender Z-up)

Met anomalisch Circle.003:

| | X | Y | Z |
|---|---|---|---|
| Min | −0.413 | −1.761 | −3.439 |
| Max | 0.413 | 1.721 | 0.978 |
| Afmeting | 0.826 | 3.482 | 4.416 |

**Exclusief anomalisch Circle.003** (realistische fiets-bbox):

| | X | Y | Z |
|---|---|---|---|
| Min | −0.413 | −1.761 | −1.183 |
| Max | 0.413 | 1.721 | 0.978 |
| Afmeting | 0.826 | 3.482 | 2.161 |

### 2.3 Wielen (racefiets)

| Wiel | Object (band) | Centrum (X, Y, Z) | Buitendiameter | Bijbehorende velg/schijf |
|---|---|---|---|---|
| **Voorwiel** | Cylinder.075 | (0.001, 0.982, −0.405) | **1.477** (Y) × 1.477 (Z) | Circle.004 @ Y=0.982 |
| **Achterwiel** | Cylinder.023 | (0.001, −0.983, −0.406) | **1.555** (Y) × 1.555 (Z) | Circle @ Y=−0.980 |

Identificatie voor/achter: stuur `Cylinder.001` staat op Y=0.898 (zelfde kant als Cylinder.075). Stuur + voorwiel op **positief Y**.

### 2.4 Frame (kleur-tinting, racefiets)

| Object(en) | Materiaal | Basiskleur (Principled BSDF) |
|---|---|---|
| Cube, Cube.001, Cube.002 (hoofdframe) | **Material** | RGB **(0.800, 0.800, 0.800)** = lichtgrijs |

Alle materiaalkleuringen in deze racefiets zijn grijstinten (Material.001/004/008 ≈ bijna zwart = carbon). Voor kleur-tinting: pas `Material` Base Color aan.

### 2.5 Cranks/pedalen (racefiets)

Geen expliciet benoemde pedaal- of crankobjecten gevonden. `Cylinder.039` bij (0.067, −0.190, −0.543), afm. (0.026, 0.404, 0.403) is een dunne platte cirkel (⌀≈0.403) — mogelijk het kettingblad. **Cranklengte niet bepaalbaar.**

### 2.6 Rijrichting (racefiets)

Wielcentra-scheidingsas: **Y-as**.  
Stuur (Cylinder.001) op Y=+0.898, voorwiel op Y=+0.982 → **rijrichting: +Y**.

### 2.7 Y-up GLB-conversie (racefiets)

**Ja.** Blender's glTF-exporter gebruikt met `export_yup=True` (standaard). Blender Z-up → glTF Y-up. Three.js-import correct.

---

## 3. Technische noot: Blender 5.2 headless-crash en workarounds

Blender 5.2.0 LTS crasht in `--background`-modus op dit Apple Silicon Mac door een null-pointer in `supports_barycentric_whitelist()` (Metal GPU-backend). De functie roept `[[MTLDevice name] UTF8String]` aan; in headless-modus retourneert dit `NULL`, waarna `strstr(NULL, "AMD")` crasht.

**MTB-workaround:** Volledig in Node.js verwerkt: eigen OBJ-parser + GLB-writer; geen Blender nodig.

**Racefiets-workaround:** Blender-binary gekopieerd naar scratchpad; functie `supports_barycentric_whitelist` gepatcht (8 bytes op file-offset 0xcffb70: `mov w0, #0; ret`); binary opnieuw gesigneerd (ad-hoc + `cs.allow-dyld-environment-variables`). Originele Blender-installatie onaangetast.
