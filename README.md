# Metamaterial Sweep Tool

A browser-based design space explorer for Triply Periodic Minimal Surface (TPMS) metamaterials. Sweep hundreds of geometric configurations in parallel, rank them by mechanical or thermal performance, and export the best candidates for validation.

**[Open the Sweep Tool](https://mshomper.github.io/metamaterial-sweep-tool)**

Companion to the [TPMS Builder](https://mshomper.github.io/tpms-builder).

---

## What It Does

The sweep tool takes a TPMS recipe (exported from the Builder) and explores the surrounding design space — varying wall thickness, cell scale, phase shifts, and pipe radius depending on the surface mode. Each candidate design is evaluated using a browser-based FFT-CG homogenization solver that computes effective elastic stiffness, anisotropy, connectivity, pore geometry, and optional thermal conductivity. Results are ranked, visualized in a 3D design space explorer, and exportable as JSON for downstream GPU validation.

---

## Workflow

1. Design a surface in the [TPMS Builder](https://mshomper.github.io/tpms-builder) and export a recipe JSON
2. Drop the JSON into the sweep tool
3. Select your application domain and material
4. Set your filtration ranks and target metrics
5. Run the sweep — results populate in real time
6. Hover rows to preview surface geometry; click to select
7. Export results JSON for batch validation via `batch_validate.py`

---

## Surface Modes

**Shell (sheet TPMS)**
Varies normal-weighted wall thickness directionally to break cubic symmetry and introduce mechanical anisotropy. Volume fraction scales linearly with wall thickness.

**Solid (skeletal network)**
Varies the level-set offset to control the solid fraction of the skeletal network.

**PI-TPMS (Phase-Intersected TPMS)**
A novel surface class derived from the intersection curve of two phase-shifted TPMS nodal surfaces, defined by the implicit equation:

```
Ω = { x : max(|φ_A(x)|, |φ_B(x + δ)|) ≤ r }
```

where `δ` is a phase shift vector and `r` is the pipe radius. Volume fraction scales as `r²` — a qualitatively different regime from all conventional TPMS topologies — enabling ultra-low density structures (< 2% VF) with pipe radii well within printable range. Phase shift and surface type combination independently control the resulting network topology.

---

## Computed Metrics

| Symbol | Metric | Description |
|--------|--------|-------------|
| α | Anisotropy ratio | Strongest vs. weakest stiffness axis |
| E/ρ | Stiffness / Density | Mean stiffness per unit material volume |
| α/ρ | Anisotropy efficiency | Directional bias per unit material |
| Ξ | Axial dominance | Peak axis vs. the other two combined |
| Ω | Orthotropic contrast | Spread across all three stiffness axes |
| λ | Load path efficiency | Peak E / (ρ × E_solid) — pure geometry efficiency |
| κ | Connectivity index | Fraction of axes mechanically connected (0, 0.33, 0.67, or 1.0) |
| Ex / Ey / Ez | Directional stiffness | Effective Young's modulus per axis (GPa) |
| kx / ky / kz | Thermal conductivity | Effective conductivity per axis (W/m·K) |
| kα | Thermal anisotropy | Max vs. min directional conductivity |
| k/ρ | Thermal / Density | Mean conductivity per unit material volume |
| U | Strain energy density | Mean strain energy under reference stress (kJ/m³) |
| με | Microstrain | Strain per axis under reference load |
| φ | Mean pore size | Inscribed sphere diameter (µm) |
| φt | Throat diameter | Narrowest pore connection (µm) |
| perc | Void percolation | Fraction of axes with open pore channels |

---

## Application Domains

Selecting a domain filters the visible metrics, sets domain-appropriate rank defaults, and constrains the material selector to relevant alloys and polymers.

| Domain | Default Material Options | Primary Rank Default |
|--------|--------------------------|----------------------|
| General | — (agnostic) | User defined |
| Biomedical | Ti6Al4V, PEEK, SS316L, HA Ceramic | Microstrain → pore size → throat size |
| Aerospace | Ti6Al4V, Al 7075, Inconel 718, CFRP | Load path efficiency → anisotropy → VF |
| Oil & Gas | SS316L, Inconel 625, Tool Steel | Connectivity → isotropy → stiffness density |
| Automotive | Al 6061, HSLA Steel, Nylon PA12 | Ortho contrast → stiffness density → VF |
| Thermal | Copper, Al 6061, Ti6Al4V | Thermal/density → thermal anisotropy → connectivity |

---

## Filtration System

Three sequential rank filters narrow the design space:

- **Rank 1** — Sorts all sampled designs by the chosen metric (MAX or MIN). No designs are eliminated at this stage.
- **Rank 2** — Keeps the top N% of Rank 1 survivors by a second metric. Default: top 50%.
- **Rank 3** — Keeps the top N% of Rank 2 survivors by a third metric. Default: top 25%.

After sequential filtering, remaining designs are ranked by one of two modes:

- **Ideal Corner** — Euclidean distance from the theoretically perfect corner of the 3D design space (closest = Rank 1).
- **Outlier** — KNN-based isolation score (k=5). Surfaces far from the cluster center — unusual, potentially novel configurations.

---

## 3D Design Space Explorer

The canvas in the upper right plots all surviving designs as a 3D scatter. Axes map to the three rank filter metrics. Click and drag to rotate. Hover a point to preview its surface and highlight the corresponding table row. Click to select for export.

Color modes:
- **Rank** — Teal / blue / purple for top 3; grey for the rest.
- **Terms** — K-means cluster coloring (k=6) based on surface term composition.

---

## Solver

The homogenization engine is a browser-native FFT-CG (Fast Fourier Transform – Conjugate Gradient) solver based on the Lippmann-Schwinger formulation. It computes effective elastic stiffness by solving three independent normal load cases on a voxelized unit cell, extracting Ex, Ey, Ez from the compliance tensor inverse.

Key implementation details:
- **Grid resolution:** N=64³ for PI-TPMS (required to resolve thin pipes), N=16³ for shell and solid modes
- **Parallelism:** Web Workers — one per logical CPU core minus one, keeping the UI responsive. All cores run simultaneously during a sweep
- **Connectivity:** BFS face-to-face topological check per axis before solving — disconnected axes are skipped, preventing FFT-CG ill-conditioning
- **Caching:** The Green operator Γ is precomputed once per sweep and shared across all samples with the same material and grid size
- **Thermal:** Optional scalar FFT-CG thermal solve (three flux load cases) activated only in the Thermal domain

---

## PI-TPMS Degenerate Shift Handling

The sweep automatically skips known degenerate phase shifts — configurations where the two TPMS surfaces become coincident, producing a sheet instead of a pipe network. The `(0,0,0)` shift is always blocked. Surface-specific degenerates (e.g. `(0.5, 0.5, 0.5)` for the Lidinoid, which is provably degenerate due to its frequency-2 term structure) are documented in the shift library in `solver.js` and excluded during sampling.

---

## Files

| File | Description |
|------|-------------|
| `index.html` | UI, controls, WebGL surface preview, 3D design space plot, table, export |
| `solver.js` | FFT-CG elastic and thermal homogenization, voxelizer, pore analysis, Web Worker handler |

`solver.js` is loaded both as a `<script>` (for preset resolution on the main thread) and as a `Worker` (for parallel sweep execution). The worker handler activates only in worker scope, detected via `typeof importScripts === 'function'`.

---

## Export Format

The exported JSON contains the full sweep metadata, base recipe parameters, and per-design records including browser FFT-CG estimates and complete term definitions for downstream GPU validation via `batch_validate.py` in the [TPMS Pipeline](https://github.com/mshomper/tpms-builder).

---

## Related Tools

- **[TPMS Builder](https://mshomper.github.io/tpms-builder)** — Design and visualize individual TPMS surfaces, export recipe JSON
- **batch_validate.py** — Docker-based GPU FFT homogenization for high-accuracy validation of sweep candidates

---

## License

MIT
