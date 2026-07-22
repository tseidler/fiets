# Environment Models — Measurement Report

Generated: 2026-07-22  
Pipeline: Blender 5.2.0 LTS headless (patched binary), Python OBJ → GLB  
Coordinate system in this report: **Blender Z-up** (world space after import)  
Export: `export_yup=True` — GLB root is Y-up (glTF standard)

---

## building04

**Source:** `assets/environment/3pl90nmkl3sw-building_04_all/building_04.obj`  
**Output:** `public/models/env/building04.glb` — **2.10 MB**  
**Processing:** removed cameras/lights/ground (none found); applied modifiers; no decimation needed

| Object | Center (X,Y,Z) | Dims (X,Y,Z) | Verts |
|--------|---------------|--------------|-------|
| building_04 | (0.283, −0.319, 2.659) | (6.123, 6.547, 6.344) | 24,323 |

**Total bbox (Blender Z-up):**  
- min: (−2.778, −3.592, −0.514)  
- max: (3.345, 2.954, 5.831)  
- dims: (6.123, 6.547, 6.344)

**Materials (10):** metal_grey, foundation_grey_brick, curb, plaster_grey, wood_balls_brown, window_glass, plaster_white, plate_white, parapet, wood_brown  
No embedded textures — vertex/material colors only.

---

## cottage

**Source:** `assets/environment/45-cottage_free_other/Cottage_FREE.obj` (OBJ fallback from Blender 2.80 .blend)  
**PBR textures:** `Cottage_Clean/` (Base_Color, Normal, Roughness — each resized 4096→512 px, saved as 8-bit PNG before GLB embed)  
**Output:** `public/models/env/cottage.glb` — **1.16 MB**  
**Processing:** 1 mesh object; cleared OBJ materials; applied Principled BSDF with 3 PBR textures (512×512)

| Object | Center (X,Y,Z) | Dims (X,Y,Z) | Verts |
|--------|---------------|--------------|-------|
| Cottage_Free | (0.184, −0.296, 3.361) | (12.438, 14.650, 6.753) | 3,351 |

**Total bbox (Blender Z-up):**  
- min: (−6.034, −7.621, −0.016)  
- max: (6.403, 7.029, 6.737)  
- dims: (12.438, 14.650, 6.753)

**Material:** Cottage_PBR (Principled BSDF)  
- Base Color: `Cottage_Clean_Base_Color.png` @ 512×512  
- Roughness: `Cottage_Clean_Roughness.png` @ 512×512 (Non-Color)  
- Normal: `Cottage_Clean_Normal.png` @ 512×512 (Non-Color, NormalMap node)

---

## cyprys

**Source:** `assets/environment/tej7ntrwa7sw-Cyprys_All_Format/Cyprys_House_obj.zip` (extracted to scratchpad)  
**Output:** `public/models/env/cyprys.glb` — **1.89 MB**  
**Processing:** 197,432 verts → decimated (ratio≈0.152) → 66,433 verts; no textures (material colors only)

| Object | Center (X,Y,Z) | Dims (X,Y,Z) | Verts |
|--------|---------------|--------------|-------|
| Cyprys_House | (4.698, 6.866, 4.144) | (12.002, 16.010, 8.476) | 66,433 |

**Total bbox (Blender Z-up):**  
- min: (−1.303, −1.139, −0.094)  
- max: (10.699, 14.871, 8.382)  
- dims: (12.002, 16.010, 8.476)

**Materials (9):** metal_dark_brown, metal_grey, wood_brown, plaster_light_brown, plaster_sand, plate_grey, wood_balls_brown, foundation_brown_brick, glass_window  
Note: Blender warned "Mesh is not valid" after decimation — minor non-manifold geometry; visually acceptable.

---

## bambo

**Source:** `assets/environment/9sah6517agw0-All_Bambo_House/Bambo_House_obj.rar` (extracted with `bsdtar`)  
**Output:** `public/models/env/bambo.glb` — **1.65 MB**  
**Processing:** 23,869 verts — well within budget; no decimation needed; no textures (material colors only)

| Object | Center (X,Y,Z) | Dims (X,Y,Z) | Verts |
|--------|---------------|--------------|-------|
| Bambo_House | (5.864, 5.886, 4.442) | (13.636, 14.536, 8.995) | 23,869 |

**Total bbox (Blender Z-up):**  
- min: (−0.954, −1.382, −0.055)  
- max: (12.682, 13.154, 8.940)  
- dims: (13.636, 14.536, 8.995)

**Materials (11):** glass_window, metal_dark, plaster_white, plate_grey, metal_grey, mirror_lamp, marble_grey, wood_light, foundation_mosaic, plaster_grey, wood_balls

---

## Skipped Models

| Model | Reason |
|-------|--------|
| `camper1.max` | 3ds Max format (.max) — not importable without 3ds Max; no free headless converter available |

---

## Summary

| GLB | Size | Verts (final) | Textures |
|-----|------|---------------|----------|
| building04.glb | 2.10 MB | 24,323 | none (material colors) |
| cottage.glb | 1.16 MB | 3,351 | 3 × 512×512 PNG (PBR) |
| cyprys.glb | 1.89 MB | 66,433 | none (material colors) |
| bambo.glb | 1.65 MB | 23,869 | none (material colors) |

All GLBs exported with `+Y-up` (glTF standard). Origins set to bbox center per object before export.  
Coordinate transform reference: Blender Z-up → glTF Y-up via `export_yup=True`  
(glTF X = Blender X, glTF Y = Blender Z, glTF Z = −Blender Y)

---

## Trees

Generated: 2026-07-22  
Source: `assets/environment/TreeSet2/TreeSet.blend` (56 MB, Blender blend)  
Output: `public/models/env/trees/`

**Decimation method:**
- Trunks: thousands of tiny disconnected bark-plate islands (~3,600–7,600 islands per tree). Blender Decimate COLLAPSE cannot merge across disconnected components, so a custom island-culling algorithm was used: flood-fill connected face islands, sort by size descending, keep largest islands until target face budget is reached.
- Leaves: individual isolated alpha-quad planes. Random face deletion via bmesh to keep target count.

**Textures:** all 7 texture files from `Textures/` resized to 512×512, saved as 8-bit PNG before GLB embed.

### treeset1.glb — Autumn_Tree

| Mesh | Verts |
|------|-------|
| trunk (tree) | 2,212 |
| leaves | 5,000 |
| **Total** | **7,212** |

**File size:** 0.26 MB (263 KB) ✓  
**Total bbox (Blender Z-up):**  
- min: (−4.334, −5.278, −0.018)  
- max: (4.521, 4.757, 16.747)  
- dims: (8.856, 10.035, 16.765)  
- Height: **16.77 m**  

**Alpha leaves:** yes — `mat.blend_method = 'CLIP'` (threshold 0.3), leaf textures are PNG with alpha channel  
**Trunk foot vs bbox center:** trunk base at Z ≈ 0; bbox center at Z ≈ 8.4 m (normal for a tree)

---

### treeset2.glb — Pine_Tree

| Mesh | Verts |
|------|-------|
| trunk (tree.001) | 2,144 |
| leaves (leaves.001) | 5,000 |
| **Total** | **7,144** |

**File size:** 0.26 MB (262 KB) ✓  
**Total bbox (Blender Z-up):**  
- min: (−5.650, −15.870, −0.012)  
- max: (5.330, −6.094, 17.628)  
- dims: (10.980, 9.777, 17.641)  
- Height: **17.64 m**  

Note: Y offset (−15.87 to −6.09) indicates the pine tree was positioned away from origin in the original blend scene; origin set to bbox center per object before export.  
**Alpha leaves:** yes — same clip mode as treeset1

---

### treeset3.glb — Regular_Tree

| Mesh | Verts |
|------|-------|
| trunk (tree.002) | 1,936 |
| leaves (leaves.002) | 5,000 |
| **Total** | **6,936** |

**File size:** 0.25 MB (252 KB) ✓  
**Total bbox (Blender Z-up):**  
- min: (−3.634, −4.067, −0.012)  
- max: (3.865, 3.794, 17.562)  
- dims: (7.499, 7.861, 17.574)  
- Height: **17.57 m**  

**Alpha leaves:** yes

---

### Skipped Tree Sources

| Source | Reason |
|--------|--------|
| `22-trees_9_obj/trees9.obj` | 8 OBJ objects grouped by material (not by tree). After `separate(type='LOOSE')`, Mossy_Tr alone splits into 2,112 pieces — spatial clustering into individual trees not feasible without complex scripting. Skipped per "rommeltje" fallback rule. |
| `tree1_3ds/Tree1.3ds` | Blender 5.2 `import_scene.autodesk_3ds` operator is registered but not callable (addon disabled). No 3DS importer available without installation. Skipped per instructions. |

---

### Trees Summary

| GLB | Blender Collection | Verts | Alpha Leaves | Size | Height |
|-----|-------------------|-------|--------------|------|--------|
| treeset1.glb | Autumn_Tree | 7,212 | yes (CLIP) | 0.26 MB | 16.77 m |
| treeset2.glb | Pine_Tree | 7,144 | yes (CLIP) | 0.26 MB | 17.64 m |
| treeset3.glb | Regular_Tree | 6,936 | yes (CLIP) | 0.25 MB | 17.57 m |

All GLBs exported +Y-up. Origins set to bbox center per object. Textures 512×512 embedded.
