'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// TPMS PARAMETER SWEEP — SOLVER
// Runs as both a plain <script> (main thread, for resolveRawPreset)
// and a Web Worker (parallel sweep execution).
// All functions are pure math — no DOM access.
// ═══════════════════════════════════════════════════════════════════════════

// ─── PI-TPMS shift library ───────────────────────────────────────────────────
const PI_SHIFT_LIBRARY = {
  gyroid:       { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.10-0.15':{conn3_pct:1},'0.15-0.20':{conn3_pct:5},'0.20-0.30':{conn3_pct:13},'0.30-0.40':{conn3_pct:33}}, notes: 'Best for VF 1-3%' },
  schwarzP:     { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:17}} },
  schwarzD:     { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.20-0.30':{conn3_pct:12},'0.30-0.40':{conn3_pct:26}} },
  fischerKochS: { degenerate: [], freq2_favorable: true, radius_hints: {'0.10-0.15':{conn3_pct:4},'0.30-0.40':{conn3_pct:93}}, notes: '93% 3-axis @ r=0.40' },
  frd:          { degenerate: [], freq2_favorable: true, radius_hints: {'0.30-0.40':{conn3_pct:21}} },
  lidinoid:     { degenerate: [[0.5,0.5,0.5]], freq2_favorable: true, radius_hints: {'0.30-0.40':{conn3_pct:40}} },
  neovius:      { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:3}} },
  splitP:       { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.20-0.30':{conn3_pct:28},'0.30-0.40':{conn3_pct:54}} },
  iwp:          { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:0}} },
  gyroidHarmonic: { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:46}} },
  primitiveC:   { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:0}} },
  octo:         { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:3}} },
  pHarmonic:    { degenerate: [[0.5,0.5,0.5]], radius_hints: {'0.30-0.40':{conn3_pct:50}} },
};

// ─── Raw preset → explicit terms ─────────────────────────────────────────────
// Expands surface presets that use double-frequency terms into the factor model.
// Used by loadFile (main thread) and potentially by workers for preset-based sweeps.
function resolveRawPreset(preset) {
  const mk = (factors, coef) => ({ on: true, coef, factors });
  const f  = (trig, fx=1, fy=1, fz=1) => ({ trig, fx, fy, fz });
  switch (preset) {
    case 'fks':
      return [
        mk([f('cos(x)',2,1,1), f('sin(y)'), f('cos(z)')], 1),
        mk([f('cos(y)',1,2,1), f('sin(z)'), f('cos(x)')], 1),
        mk([f('cos(z)',1,1,2), f('sin(x)'), f('cos(y)')], 1),
      ];
    case 'lidinoid':
      return [
        mk([f('sin(x)',2,1,1), f('cos(y)'), f('sin(z)')],  1.1),
        mk([f('sin(y)',1,2,1), f('cos(z)'), f('sin(x)')],  1.1),
        mk([f('sin(z)',1,1,2), f('cos(x)'), f('sin(y)')],  1.1),
        mk([f('cos(x)',2,1,1), f('cos(y)',1,2,1)],         -0.2),
        mk([f('cos(y)',1,2,1), f('cos(z)',1,1,2)],         -0.2),
        mk([f('cos(z)',1,1,2), f('cos(x)',2,1,1)],         -0.2),
        mk([f('cos(x)',2,1,1)],                            -0.4),
        mk([f('cos(y)',1,2,1)],                            -0.4),
        mk([f('cos(z)',1,1,2)],                            -0.4),
      ];
    case 'splitP':
      return [
        mk([f('sin(x)'), f('sin(y)'), f('cos(z)')], 1),
        mk([f('sin(y)'), f('sin(z)'), f('cos(x)')], 1),
        mk([f('sin(z)'), f('sin(x)'), f('cos(y)')], 1),
      ];
    case 'frd':
      return [
        mk([f('sin(x)',2,1,1), f('cos(y)'), f('sin(z)')],  1),
        mk([f('sin(y)',1,2,1), f('cos(z)'), f('sin(x)')],  1),
        mk([f('sin(z)',1,1,2), f('cos(x)'), f('sin(y)')],  1),
        mk([f('cos(x)',2,1,1), f('cos(y)',1,2,1)],         -1),
        mk([f('cos(y)',1,2,1), f('cos(z)',1,1,2)],         -1),
        mk([f('cos(z)',1,1,2), f('cos(x)',2,1,1)],         -1),
      ];
    case 'gyroidHarmonic':
      return [
        mk([f('sin(x)'), f('cos(y)')],                     1),
        mk([f('sin(y)'), f('cos(z)')],                     1),
        mk([f('sin(z)'), f('cos(x)')],                     1),
        mk([f('sin(x)',2,1,1), f('cos(y)',1,2,1)],         0.3),
        mk([f('sin(y)',1,2,1), f('cos(z)',1,1,2)],         0.3),
        mk([f('sin(z)',1,1,2), f('cos(x)',2,1,1)],         0.3),
      ];
    case 'primitiveC':
      return [
        mk([f('cos(x)')],                                  2),
        mk([f('cos(y)')],                                  2),
        mk([f('cos(z)')],                                  2),
        mk([f('cos(x)',2,1,1)],                           -1),
        mk([f('cos(y)',1,2,1)],                           -1),
        mk([f('cos(z)',1,1,2)],                           -1),
      ];
    case 'octo':
      return [
        mk([f('cos(x)')],                                  1),
        mk([f('cos(y)')],                                  1),
        mk([f('cos(z)')],                                  1),
        mk([f('cos(x)',2,1,1), f('cos(y)',1,2,1)],        -0.5),
        mk([f('cos(y)',1,2,1), f('cos(z)',1,1,2)],        -0.5),
        mk([f('cos(z)',1,1,2), f('cos(x)',2,1,1)],        -0.5),
      ];
    case 'pHarmonic':
      return [
        mk([f('cos(x)')],                                  1),
        mk([f('cos(y)')],                                  1),
        mk([f('cos(z)')],                                  1),
        mk([f('cos(x)',2,1,1)],                            0.25),
        mk([f('cos(y)',1,2,1)],                            0.25),
        mk([f('cos(z)',1,1,2)],                            0.25),
      ];
    default:
      return null;
  }
}

// ─── TPMS field evaluator ─────────────────────────────────────────────────────
function evaluateTpms(terms, x, y, z) {
  let result = 0;
  for (const term of terms) {
    if (!term.on) continue;
    let product = term.coef;
    for (const f of term.factors) {
      const trig = f.trig;
      if      (trig === 'sin(x)') product *= Math.sin(f.fx * x);
      else if (trig === 'cos(x)') product *= Math.cos(f.fx * x);
      else if (trig === 'sin(y)') product *= Math.sin(f.fy * y);
      else if (trig === 'cos(y)') product *= Math.cos(f.fy * y);
      else if (trig === 'sin(z)') product *= Math.sin(f.fz * z);
      else if (trig === 'cos(z)') product *= Math.cos(f.fz * z);
    }
    result += product;
  }
  return result;
}

// ─── TPMS field + gradient evaluator (for pore analysis) ─────────────────────
function evaluateTpmsWithGrad(terms, x, y, z) {
  let phi = 0;
  let gx = 0, gy = 0, gz = 0;

  for (const term of terms) {
    if (!term.on) continue;
    const c = term.coef;
    const factors = term.factors;

    let val = c;
    for (const f of factors) {
      const t = f.trig;
      if      (t === 'sin(x)') val *= Math.sin(f.fx * x);
      else if (t === 'cos(x)') val *= Math.cos(f.fx * x);
      else if (t === 'sin(y)') val *= Math.sin(f.fy * y);
      else if (t === 'cos(y)') val *= Math.cos(f.fy * y);
      else if (t === 'sin(z)') val *= Math.sin(f.fz * z);
      else if (t === 'cos(z)') val *= Math.cos(f.fz * z);
    }
    phi += val;

    // ∂term/∂x
    let term_dx = 0;
    for (let fi = 0; fi < factors.length; fi++) {
      const f = factors[fi];
      const t = f.trig;
      if (t !== 'sin(x)' && t !== 'cos(x)') continue;
      let d = c;
      if      (t === 'sin(x)') d *= f.fx * Math.cos(f.fx * x);
      else if (t === 'cos(x)') d *= -f.fx * Math.sin(f.fx * x);
      for (let fj = 0; fj < factors.length; fj++) {
        if (fj === fi) continue;
        const g = factors[fj]; const gt = g.trig;
        if      (gt === 'sin(x)') d *= Math.sin(g.fx * x);
        else if (gt === 'cos(x)') d *= Math.cos(g.fx * x);
        else if (gt === 'sin(y)') d *= Math.sin(g.fy * y);
        else if (gt === 'cos(y)') d *= Math.cos(g.fy * y);
        else if (gt === 'sin(z)') d *= Math.sin(g.fz * z);
        else if (gt === 'cos(z)') d *= Math.cos(g.fz * z);
      }
      term_dx += d;
    }
    gx += term_dx;

    // ∂term/∂y
    let term_dy = 0;
    for (let fi = 0; fi < factors.length; fi++) {
      const f = factors[fi];
      const t = f.trig;
      if (t !== 'sin(y)' && t !== 'cos(y)') continue;
      let d = c;
      if      (t === 'sin(y)') d *= f.fy * Math.cos(f.fy * y);
      else if (t === 'cos(y)') d *= -f.fy * Math.sin(f.fy * y);
      for (let fj = 0; fj < factors.length; fj++) {
        if (fj === fi) continue;
        const g = factors[fj]; const gt = g.trig;
        if      (gt === 'sin(x)') d *= Math.sin(g.fx * x);
        else if (gt === 'cos(x)') d *= Math.cos(g.fx * x);
        else if (gt === 'sin(y)') d *= Math.sin(g.fy * y);
        else if (gt === 'cos(y)') d *= Math.cos(g.fy * y);
        else if (gt === 'sin(z)') d *= Math.sin(g.fz * z);
        else if (gt === 'cos(z)') d *= Math.cos(g.fz * z);
      }
      term_dy += d;
    }
    gy += term_dy;

    // ∂term/∂z
    let term_dz = 0;
    for (let fi = 0; fi < factors.length; fi++) {
      const f = factors[fi];
      const t = f.trig;
      if (t !== 'sin(z)' && t !== 'cos(z)') continue;
      let d = c;
      if      (t === 'sin(z)') d *= f.fz * Math.cos(f.fz * z);
      else if (t === 'cos(z)') d *= -f.fz * Math.sin(f.fz * z);
      for (let fj = 0; fj < factors.length; fj++) {
        if (fj === fi) continue;
        const g = factors[fj]; const gt = g.trig;
        if      (gt === 'sin(x)') d *= Math.sin(g.fx * x);
        else if (gt === 'cos(x)') d *= Math.cos(g.fx * x);
        else if (gt === 'sin(y)') d *= Math.sin(g.fy * y);
        else if (gt === 'cos(y)') d *= Math.cos(g.fy * y);
        else if (gt === 'sin(z)') d *= Math.sin(g.fz * z);
        else if (gt === 'cos(z)') d *= Math.cos(g.fz * z);
      }
      term_dz += d;
    }
    gz += term_dz;
  }

  const gradMag = Math.sqrt(gx*gx + gy*gy + gz*gz) || 1e-9;
  return { phi, gradMag };
}

// ─── Isotropic 6×6 Voigt stiffness tensor ────────────────────────────────────
function isoC(E, nu) {
  const lam = E * nu / ((1 + nu) * (1 - 2 * nu));
  const mu  = E / (2 * (1 + nu));
  const C = new Float64Array(36);
  C[0]=C[7]=C[14] = lam + 2*mu;
  C[1]=C[2]=C[6]=C[8]=C[12]=C[13] = lam;
  C[21]=C[28]=C[35] = mu;
  return C;
}

// ─── Voxel solid mask, shape N³ ──────────────────────────────────────────────
function buildVoxels(terms, offset, N, isShell, wt, nWeights, piMode, pipeR, phaseShift) {
  const L    = Math.PI;
  const step = (2 * L) / N;
  const N3   = N * N * N;

  const V = new Float32Array(N3);
  for (let i = 0; i < N; i++) {
    const x = -L + (i + 0.5) * step;
    for (let j = 0; j < N; j++) {
      const y = -L + (j + 0.5) * step;
      for (let k = 0; k < N; k++) {
        V[i*N*N + j*N + k] = evaluateTpms(terms, x, y, -L + (k+0.5)*step);
      }
    }
  }

  const solid = new Float32Array(N3);

  if (piMode) {
    const TWO_PI = 2 * Math.PI;
    const dx = (phaseShift?.x || 0) * TWO_PI;
    const dy = (phaseShift?.y || 0) * TWO_PI;
    const dz = (phaseShift?.z || 0) * TWO_PI;
    const pr = pipeR || 0.1;
    for (let i = 0; i < N; i++) {
      const x = -L + (i + 0.5) * step;
      for (let j = 0; j < N; j++) {
        const y = -L + (j + 0.5) * step;
        for (let k = 0; k < N; k++) {
          const vA = V[i*N*N + j*N + k];
          const vB = evaluateTpms(terms, x + dx, y + dy, -L + (k+0.5)*step + dz);
          solid[i*N*N + j*N + k] = Math.max(Math.abs(vA), Math.abs(vB)) <= pr ? 1 : 0;
        }
      }
    }
  } else if (isShell && nWeights) {
    const wx = nWeights.wx, wy = nWeights.wy, wz = nWeights.wz;
    for (let i = 0; i < N; i++) {
      const ip = (i+1) % N, im = (i+N-1) % N;
      for (let j = 0; j < N; j++) {
        const jp = (j+1) % N, jm = (j+N-1) % N;
        for (let k = 0; k < N; k++) {
          const kp = (k+1) % N, km = (k+N-1) % N;
          const gx = (V[ip*N*N+j*N+k] - V[im*N*N+j*N+k]) / (2*step);
          const gy = (V[i*N*N+jp*N+k] - V[i*N*N+jm*N+k]) / (2*step);
          const gz = (V[i*N*N+j*N+kp] - V[i*N*N+j*N+km]) / (2*step);
          const gLen = Math.sqrt(gx*gx + gy*gy + gz*gz) || 1;
          const localWt = wt * (wx*Math.abs(gx/gLen) + wy*Math.abs(gy/gLen) + wz*Math.abs(gz/gLen));
          const idx = i*N*N + j*N + k;
          solid[idx] = Math.abs(V[idx] - offset) < localWt ? 1 : 0;
        }
      }
    }
  } else {
    for (let idx = 0; idx < N3; idx++) {
      solid[idx] = isShell
        ? (Math.abs(V[idx] - offset) < wt ? 1 : 0)
        : (V[idx] - offset < 0 ? 1 : 0);
    }
  }

  return solid;
}

// ─── Cooley-Tukey FFT (radix-2, power-of-2 N only) ───────────────────────────
function fft1d(x, inverse) {
  const n = x.length >> 1;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = x[2*i]; x[2*i] = x[2*j]; x[2*j] = t;
      t = x[2*i+1]; x[2*i+1] = x[2*j+1]; x[2*j+1] = t;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = sign * 2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < (len >> 1); j++) {
        const uRe = x[2*(i+j)],       uIm = x[2*(i+j)+1];
        const vRe = x[2*(i+j+len/2)], vIm = x[2*(i+j+len/2)+1];
        const tvRe = curRe*vRe - curIm*vIm;
        const tvIm = curRe*vIm + curIm*vRe;
        x[2*(i+j)]         = uRe + tvRe;
        x[2*(i+j)+1]       = uIm + tvIm;
        x[2*(i+j+len/2)]   = uRe - tvRe;
        x[2*(i+j+len/2)+1] = uIm - tvIm;
        const newRe = curRe*wRe - curIm*wIm;
        curIm = curRe*wIm + curIm*wRe;
        curRe = newRe;
      }
    }
  }
  if (inverse) for (let i = 0; i < x.length; i++) x[i] /= n;
}

// ─── 3D FFT on flat N³ complex array (interleaved re/im) ─────────────────────
function fft3d(data, N, inverse) {
  const buf = new Float64Array(2 * N);
  for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    for (let i = 0; i < N; i++) { buf[2*i] = data[2*(i*N*N+j*N+k)]; buf[2*i+1] = data[2*(i*N*N+j*N+k)+1]; }
    fft1d(buf, inverse);
    for (let i = 0; i < N; i++) { data[2*(i*N*N+j*N+k)] = buf[2*i]; data[2*(i*N*N+j*N+k)+1] = buf[2*i+1]; }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
    for (let j = 0; j < N; j++) { buf[2*j] = data[2*(i*N*N+j*N+k)]; buf[2*j+1] = data[2*(i*N*N+j*N+k)+1]; }
    fft1d(buf, inverse);
    for (let j = 0; j < N; j++) { data[2*(i*N*N+j*N+k)] = buf[2*j]; data[2*(i*N*N+j*N+k)+1] = buf[2*j+1]; }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    for (let k = 0; k < N; k++) { buf[2*k] = data[2*(i*N*N+j*N+k)]; buf[2*k+1] = data[2*(i*N*N+j*N+k)+1]; }
    fft1d(buf, inverse);
    for (let k = 0; k < N; k++) { data[2*(i*N*N+j*N+k)] = buf[2*k]; data[2*(i*N*N+j*N+k)+1] = buf[2*k+1]; }
  }
}

// ─── Green operator Γ for elastic homogenization ──────────────────────────────
function buildGamma(N, mu0, lam0) {
  const N3 = N * N * N;
  const Gamma = [
    [new Float64Array(N3), new Float64Array(N3), new Float64Array(N3)],
    [new Float64Array(N3), new Float64Array(N3), new Float64Array(N3)],
    [new Float64Array(N3), new Float64Array(N3), new Float64Array(N3)],
  ];
  const a =  1.0 / mu0;
  const b = -(lam0 + mu0) / (mu0 * (lam0 + 2 * mu0));
  for (let i = 0; i < N; i++) {
    const ki = i <= N/2 ? i : i - N;
    for (let j = 0; j < N; j++) {
      const kj = j <= N/2 ? j : j - N;
      for (let k = 0; k < N; k++) {
        const kk = k <= N/2 ? k : k - N;
        const ksq = ki*ki + kj*kj + kk*kk;
        const idx = i*N*N + j*N + k;
        if (ksq === 0) continue;
        const rk = 1.0 / Math.sqrt(ksq);
        const n = [ki*rk, kj*rk, kk*rk];
        for (let p = 0; p < 3; p++) {
          for (let q = 0; q < 3; q++) {
            const Gpq = a*(p===q?1:0) + b*n[p]*n[q];
            const Gpp = a + b*n[p]*n[p];
            const Gqq = a + b*n[q]*n[q];
            Gamma[p][q][idx] = -0.25*(Gpp*n[q]*n[q] + Gqq*n[p]*n[p] + Gpq*n[p]*n[q] + Gpq*n[q]*n[p]);
          }
        }
      }
    }
  }
  return Gamma;
}

// ─── Apply Green operator row to stress fields ────────────────────────────────
function applyGammaRow(tauFields, GammaRow, N) {
  const N3 = N * N * N;
  const out = new Float64Array(2 * N3);
  for (let q = 0; q < 3; q++) {
    const tauHat = new Float64Array(2 * N3);
    for (let i = 0; i < N3; i++) tauHat[2*i] = tauFields[q][i];
    fft3d(tauHat, N, false);
    const G = GammaRow[q];
    for (let i = 0; i < N3; i++) {
      out[2*i]   += G[i] * tauHat[2*i];
      out[2*i+1] += G[i] * tauHat[2*i+1];
    }
  }
  fft3d(out, N, true);
  const result = new Float64Array(N3);
  for (let i = 0; i < N3; i++) result[i] = out[2*i];
  return result;
}

// ─── CG solver — one normal load case ────────────────────────────────────────
function cgSolveNormal(solid, C_s, C_v, C0, Gamma, N, eps_bar, tol, maxiter) {
  const N3 = N * N * N;

  function localStress(eps) {
    const sig = [new Float64Array(N3), new Float64Array(N3), new Float64Array(N3)];
    for (let idx = 0; idx < N3; idx++) {
      const C = solid[idx] ? C_s : C_v;
      for (let p = 0; p < 3; p++) {
        let v = 0;
        for (let q = 0; q < 3; q++) v += C[p*6+q] * eps[q][idx];
        sig[p][idx] = v;
      }
    }
    return sig;
  }

  function applyA(eps) {
    const sig = localStress(eps);
    const tau = [new Float64Array(N3), new Float64Array(N3), new Float64Array(N3)];
    for (let idx = 0; idx < N3; idx++) {
      for (let p = 0; p < 3; p++) {
        let c0e = 0;
        for (let q = 0; q < 3; q++) c0e += C0[p*6+q] * eps[q][idx];
        tau[p][idx] = sig[p][idx] - c0e;
      }
    }
    const deps = [
      applyGammaRow(tau, Gamma[0], N),
      applyGammaRow(tau, Gamma[1], N),
      applyGammaRow(tau, Gamma[2], N),
    ];
    return [
      Float64Array.from({length:N3}, (_,i) => eps[0][i] + deps[0][i]),
      Float64Array.from({length:N3}, (_,i) => eps[1][i] + deps[1][i]),
      Float64Array.from({length:N3}, (_,i) => eps[2][i] + deps[2][i]),
    ];
  }

  function dot(a, b) {
    let s = 0;
    for (let p = 0; p < 3; p++) for (let i = 0; i < N3; i++) s += a[p][i]*b[p][i];
    return s;
  }

  function sub(a, b) {
    return [
      Float64Array.from({length:N3}, (_,i) => a[0][i]-b[0][i]),
      Float64Array.from({length:N3}, (_,i) => a[1][i]-b[1][i]),
      Float64Array.from({length:N3}, (_,i) => a[2][i]-b[2][i]),
    ];
  }

  function addScaled(a, b, scale) {
    return [
      Float64Array.from({length:N3}, (_,i) => a[0][i]+scale*b[0][i]),
      Float64Array.from({length:N3}, (_,i) => a[1][i]+scale*b[1][i]),
      Float64Array.from({length:N3}, (_,i) => a[2][i]+scale*b[2][i]),
    ];
  }

  const eps = [
    new Float64Array(N3).fill(eps_bar[0]),
    new Float64Array(N3).fill(eps_bar[1]),
    new Float64Array(N3).fill(eps_bar[2]),
  ];
  const b = [
    new Float64Array(N3).fill(eps_bar[0]),
    new Float64Array(N3).fill(eps_bar[1]),
    new Float64Array(N3).fill(eps_bar[2]),
  ];
  const bNorm = Math.sqrt(dot(b, b)) + 1e-30;

  let r = sub(b, applyA(eps));
  let p = [r[0].slice(), r[1].slice(), r[2].slice()];
  let rr = dot(r, r);

  for (let it = 0; it < maxiter; it++) {
    const Ap  = applyA(p);
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-30) break;
    const alpha = rr / pAp;
    const epsNew = addScaled(eps, p, alpha);
    const r2 = [
      Float64Array.from({length:N3}, (_,i) => r[0][i] - alpha*Ap[0][i]),
      Float64Array.from({length:N3}, (_,i) => r[1][i] - alpha*Ap[1][i]),
      Float64Array.from({length:N3}, (_,i) => r[2][i] - alpha*Ap[2][i]),
    ];
    const rrNew = dot(r2, r2);
    if (Math.sqrt(rrNew) / bNorm < tol) break;
    eps[0].set(epsNew[0]); eps[1].set(epsNew[1]); eps[2].set(epsNew[2]);
    r[0].set(r2[0]); r[1].set(r2[1]); r[2].set(r2[2]);
    const beta = rrNew / rr;
    p = addScaled(r, p, beta);
    rr = rrNew;
  }

  const sig = localStress(eps);
  return [
    sig[0].reduce((a,b)=>a+b,0)/N3,
    sig[1].reduce((a,b)=>a+b,0)/N3,
    sig[2].reduce((a,b)=>a+b,0)/N3,
  ];
}

// ─── Solver caches — per-worker, rebuilt once per sweep ───────────────────────
let _cachedElasticGamma = null, _cachedElasticKey = '';
let _cachedThermalGamma = null, _cachedThermalKey = '';

function getElasticGamma(N, Es, nu) {
  const key = `${N}|${Es}|${nu}`;
  if (_cachedElasticKey !== key) {
    const C0 = isoC(Es, nu);
    _cachedElasticGamma = buildGamma(N, C0[21], C0[1]);
    _cachedElasticKey = key;
  }
  return _cachedElasticGamma;
}

function getThermalGamma(N, k0) {
  const key = `${N}|${k0}`;
  if (_cachedThermalKey !== key) {
    const N3 = N * N * N;
    const twoPI_N = 2 * Math.PI / N;
    const Gamma = new Float64Array(N3 * 9);
    for (let i = 0; i < N; i++) {
      const fi = i <= N/2 ? i : i - N;
      for (let j = 0; j < N; j++) {
        const fj = j <= N/2 ? j : j - N;
        for (let k = 0; k < N; k++) {
          const fk = k <= N/2 ? k : k - N;
          const idx = (i*N*N + j*N + k) * 9;
          const xi = fi * twoPI_N, xj = fj * twoPI_N, xk = fk * twoPI_N;
          const xi2 = xi*xi + xj*xj + xk*xk;
          if (xi2 < 1e-14) continue;
          const inv = 1.0 / (k0 * xi2);
          Gamma[idx+0]=xi*xi*inv; Gamma[idx+1]=xi*xj*inv; Gamma[idx+2]=xi*xk*inv;
          Gamma[idx+3]=xj*xi*inv; Gamma[idx+4]=xj*xj*inv; Gamma[idx+5]=xj*xk*inv;
          Gamma[idx+6]=xk*xi*inv; Gamma[idx+7]=xk*xj*inv; Gamma[idx+8]=xk*xk*inv;
        }
      }
    }
    _cachedThermalGamma = Gamma;
    _cachedThermalKey = key;
  }
  return _cachedThermalGamma;
}

function invalidateSolverCaches() {
  _cachedElasticKey = '';
  _cachedThermalKey = '';
}

// ─── Topological connectivity via BFS face-to-face ───────────────────────────
function detectTopologicalConnectivity(solid, N) {
  const N3 = N * N * N;
  const idx = (i,j,k) => i*N*N + j*N + k;

  function spans(seedAxis, targetVal) {
    const visited = new Uint8Array(N3);
    const queue = [];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const i0 = seedAxis === 0 ? idx(0,a,b) : seedAxis === 1 ? idx(a,0,b) : idx(a,b,0);
      if (solid[i0]) { visited[i0] = 1; queue.push(i0); }
    }
    while (queue.length > 0) {
      const v = queue.shift();
      const i = Math.floor(v / (N*N));
      const j = Math.floor((v % (N*N)) / N);
      const k = v % N;
      const coord = seedAxis === 0 ? i : seedAxis === 1 ? j : k;
      if (coord === targetVal) return true;
      const ns = [];
      if (i > 0) ns.push(idx(i-1,j,k)); if (i < N-1) ns.push(idx(i+1,j,k));
      if (j > 0) ns.push(idx(i,j-1,k)); if (j < N-1) ns.push(idx(i,j+1,k));
      if (k > 0) ns.push(idx(i,j,k-1)); if (k < N-1) ns.push(idx(i,j,k+1));
      for (const n of ns) {
        if (solid[n] && !visited[n]) { visited[n] = 1; queue.push(n); }
      }
    }
    return false;
  }

  return {
    connX: spans(0, N-1),
    connY: spans(1, N-1),
    connZ: spans(2, N-1),
  };
}

// ─── FFT-CG elastic homogenization (3 normal load cases) ─────────────────────
function fftHomogenize(terms, offset, N, isShell, wt, Es, nu, nWeights, piMode, pipeR, phaseShift) {
  const solid = buildVoxels(terms, offset, N, isShell, wt, nWeights || null, piMode || false, pipeR, phaseShift);
  const N3    = N * N * N;

  let inside = 0;
  for (let i = 0; i < N3; i++) inside += solid[i];
  const rho = inside / N3;

  const rhoMin = piMode ? 0.0005 : 0.03;
  if (rho < rhoMin || rho > 0.75) return null;

  const C_s = isoC(Es, nu);
  const C_v = isoC(Es * 1e-4, nu);
  const C0  = isoC(Es, nu);

  const Gamma = getElasticGamma(N, Es, nu);
  const tol = 5e-4, maxiter = 40;

  const connectivity = detectTopologicalConnectivity(solid, N);
  const C_eff_nn = [[0,0,0],[0,0,0],[0,0,0]];

  if (connectivity.connX) {
    const s = cgSolveNormal(solid, C_s, C_v, C0, Gamma, N, [1,0,0], tol, maxiter);
    for (let p = 0; p < 3; p++) C_eff_nn[p][0] = s[p];
  }
  if (connectivity.connY) {
    const s = cgSolveNormal(solid, C_s, C_v, C0, Gamma, N, [0,1,0], tol, maxiter);
    for (let p = 0; p < 3; p++) C_eff_nn[p][1] = s[p];
  }
  if (connectivity.connZ) {
    const s = cgSolveNormal(solid, C_s, C_v, C0, Gamma, N, [0,0,1], tol, maxiter);
    for (let p = 0; p < 3; p++) C_eff_nn[p][2] = s[p];
  }

  for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++)
    C_eff_nn[p][q] = 0.5*(C_eff_nn[p][q] + C_eff_nn[q][p]);

  const C = C_eff_nn;
  const det = C[0][0]*(C[1][1]*C[2][2]-C[1][2]*C[2][1])
            - C[0][1]*(C[1][0]*C[2][2]-C[1][2]*C[2][0])
            + C[0][2]*(C[1][0]*C[2][1]-C[1][1]*C[2][0]);
  if (Math.abs(det) < 1e-30) return null;
  const invDet = 1/det;
  const S = [
    [(C[1][1]*C[2][2]-C[1][2]*C[2][1])*invDet, (C[0][2]*C[2][1]-C[0][1]*C[2][2])*invDet, (C[0][1]*C[1][2]-C[0][2]*C[1][1])*invDet],
    [(C[1][2]*C[2][0]-C[1][0]*C[2][2])*invDet, (C[0][0]*C[2][2]-C[0][2]*C[2][0])*invDet, (C[0][2]*C[1][0]-C[0][0]*C[1][2])*invDet],
    [(C[1][0]*C[2][1]-C[1][1]*C[2][0])*invDet, (C[0][1]*C[2][0]-C[0][0]*C[2][1])*invDet, (C[0][0]*C[1][1]-C[0][1]*C[1][0])*invDet],
  ];

  return { rho, Ex: 1/S[0][0], Ey: 1/S[1][1], Ez: 1/S[2][2], solid };
}

// ─── Thermal homogenization (scalar FFT-CG) ───────────────────────────────────
function thermalHomogenize(solid, N, ks, kv) {
  const N3 = N * N * N;
  const k0 = ks;
  const Gamma = getThermalGamma(N, k0);

  function applyGamma(q) {
    const qx = new Float64Array(N3*2), qy = new Float64Array(N3*2), qz = new Float64Array(N3*2);
    for (let i = 0; i < N3; i++) { qx[2*i]=q[3*i]; qy[2*i]=q[3*i+1]; qz[2*i]=q[3*i+2]; }
    fft3d(qx, N, false); fft3d(qy, N, false); fft3d(qz, N, false);
    for (let i = 0; i < N3; i++) {
      const gi = i*9;
      const rx = qx[2*i], ix2 = qx[2*i+1];
      const ry = qy[2*i], iy  = qy[2*i+1];
      const rz = qz[2*i], iz  = qz[2*i+1];
      qx[2*i]   = Gamma[gi+0]*rx + Gamma[gi+1]*ry + Gamma[gi+2]*rz;
      qx[2*i+1] = Gamma[gi+0]*ix2+ Gamma[gi+1]*iy + Gamma[gi+2]*iz;
      qy[2*i]   = Gamma[gi+3]*rx + Gamma[gi+4]*ry + Gamma[gi+5]*rz;
      qy[2*i+1] = Gamma[gi+3]*ix2+ Gamma[gi+4]*iy + Gamma[gi+5]*iz;
      qz[2*i]   = Gamma[gi+6]*rx + Gamma[gi+7]*ry + Gamma[gi+8]*rz;
      qz[2*i+1] = Gamma[gi+6]*ix2+ Gamma[gi+7]*iy + Gamma[gi+8]*iz;
    }
    fft3d(qx, N, true); fft3d(qy, N, true); fft3d(qz, N, true);
    const out = new Float64Array(N3*3);
    for (let i = 0; i < N3; i++) { out[3*i]=qx[2*i]; out[3*i+1]=qy[2*i]; out[3*i+2]=qz[2*i]; }
    return out;
  }

  function cgThermal(ex, ey, ez) {
    const tol = 1e-4, maxiter = 40;
    const kLocal = new Float64Array(N3);
    for (let i = 0; i < N3; i++) kLocal[i] = solid[i] > 0.5 ? ks : kv;
    const eps = new Float64Array(N3*3);
    for (let iter = 0; iter < maxiter; iter++) {
      const tau = new Float64Array(N3*3);
      for (let i = 0; i < N3; i++) {
        const dk = kLocal[i] - k0;
        tau[3*i]   = dk * (ex + eps[3*i]);
        tau[3*i+1] = dk * (ey + eps[3*i+1]);
        tau[3*i+2] = dk * (ez + eps[3*i+2]);
      }
      const GT = applyGamma(tau);
      let res2 = 0;
      for (let i = 0; i < N3*3; i++) {
        const diff = -GT[i] - eps[i];
        res2 += diff * diff;
        eps[i] = -GT[i];
      }
      if (Math.sqrt(res2 / N3) < tol) break;
    }
    let keff = 0;
    for (let i = 0; i < N3; i++) {
      const gx = ex + eps[3*i], gy = ey + eps[3*i+1], gz = ez + eps[3*i+2];
      keff += kLocal[i] * (ex*gx + ey*gy + ez*gz);
    }
    return keff / N3;
  }

  return {
    kx: +cgThermal(1,0,0).toFixed(4),
    ky: +cgThermal(0,1,0).toFixed(4),
    kz: +cgThermal(0,0,1).toFixed(4),
  };
}

// ─── Pore analysis — gradient-normalised SDF ──────────────────────────────────
function analyzePores(terms, offset, mode, wallT, pipeR, phaseShift, cellMult, cellSizeMm, N) {
  const isPi    = mode === 'pi-tpms';
  const isShell = mode === 'shell';
  const N3 = N * N * N;
  const L    = Math.PI;
  const step = 2 * L / N;
  const umPerUnit = (cellSizeMm * 1000) / (2 * Math.PI);
  const TWO_PI = 2 * Math.PI;
  const dx = isPi ? (phaseShift?.x || 0) * TWO_PI : 0;
  const dy = isPi ? (phaseShift?.y || 0) * TWO_PI : 0;
  const dz = isPi ? (phaseShift?.z || 0) * TWO_PI : 0;
  const pr = pipeR || 0.1;
  const wt = wallT || 0.3;

  function evalRaw(x, y, z) {
    const phi = evaluateTpms(terms, x, y, z);
    if (isPi) {
      const phiB = evaluateTpms(terms, x+dx, y+dy, z+dz);
      return Math.max(Math.abs(phi), Math.abs(phiB)) - pr;
    }
    if (isShell) return Math.abs(phi - offset) - wt;
    return phi - offset;
  }

  const dField   = new Float32Array(N3);
  const voidMask = new Uint8Array(N3);
  let gradSum = 0, gradCount = 0;

  for (let i = 0; i < N; i++) {
    const x = -L + (i + 0.5) * step;
    for (let j = 0; j < N; j++) {
      const y = -L + (j + 0.5) * step;
      for (let k = 0; k < N; k++) {
        const z = -L + (k + 0.5) * step;
        const raw = evalRaw(x, y, z);
        const id  = i*N*N + j*N + k;
        if (raw > 0) {
          dField[id]   = raw;
          voidMask[id] = 1;
          if (raw < 0.3) {
            const { gradMag } = evaluateTpmsWithGrad(terms, x, y, z);
            gradSum += gradMag;
            gradCount++;
          }
        }
      }
    }
  }

  const gradNorm = gradCount > 0 ? gradSum / gradCount : 1.0;
  const dVals = [];
  for (let i = 0; i < N3; i++) {
    if (voidMask[i]) dVals.push(dField[i] / gradNorm);
  }
  if (dVals.length === 0) return { pore_size: 0, throat_size: 0, perc_idx: 0 };

  dVals.sort((a, b) => a - b);
  const n = dVals.length;
  const topVals = dVals.slice(Math.floor(n * 0.90));
  const meanTop = topVals.reduce((s, v) => s + v, 0) / topVals.length;
  const pore_size = Math.round(meanTop * 2 * umPerUnit);

  const idxFn = (i,j,k) => i*N*N + j*N + k;
  let maxSurfGrad = 0;
  for (let i = 0; i < N; i++) {
    const x = -L + (i + 0.5) * step;
    for (let j = 0; j < N; j++) {
      const y = -L + (j + 0.5) * step;
      for (let k = 0; k < N; k++) {
        const z = -L + (k + 0.5) * step;
        if (!voidMask[idxFn(i,j,k)]) continue;
        if (dField[idxFn(i,j,k)] >= 0.3) continue;
        const { gradMag } = evaluateTpmsWithGrad(terms, x, y, z);
        if (gradMag > maxSurfGrad) maxSurfGrad = gradMag;
      }
    }
  }
  const surfParam = isPi ? pr : wt;
  const throat_size = maxSurfGrad > 0
    ? Math.round((surfParam / maxSurfGrad) * 2 * umPerUnit)
    : 0;

  function percolates(axis) {
    const visited = new Uint8Array(N3);
    const queue = [];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const i0 = axis === 0 ? idxFn(0,a,b) : axis === 1 ? idxFn(a,0,b) : idxFn(a,b,0);
      if (voidMask[i0]) { visited[i0] = 1; queue.push(i0); }
    }
    while (queue.length > 0) {
      const v = queue.shift();
      const i = Math.floor(v / (N*N));
      const j = Math.floor((v % (N*N)) / N);
      const k = v % N;
      const coord = axis === 0 ? i : axis === 1 ? j : k;
      if (coord === N-1) return true;
      const ns = [];
      if (i > 0) ns.push(idxFn(i-1,j,k)); if (i < N-1) ns.push(idxFn(i+1,j,k));
      if (j > 0) ns.push(idxFn(i,j-1,k)); if (j < N-1) ns.push(idxFn(i,j+1,k));
      if (k > 0) ns.push(idxFn(i,j,k-1)); if (k < N-1) ns.push(idxFn(i,j,k+1));
      for (const ni of ns) {
        if (voidMask[ni] && !visited[ni]) { visited[ni] = 1; queue.push(ni); }
      }
    }
    return false;
  }

  const px = percolates(0), py = percolates(1), pz = percolates(2);
  const perc_idx = +((+px + +py + +pz) / 3).toFixed(2);
  return { pore_size, throat_size, perc_idx };
}

// ─── Full homogenization — called per sample ──────────────────────────────────
// domain: 'general' | 'biomedical' | 'aerospace' | 'oilgas' | 'automotive' | 'thermal'
// Replaces the former DOM access (document.getElementById('domainSel').value).
function estimateHomogenization(terms, offset, scaleX, scaleY, scaleZ, Es, nu, baseline, mode, wallThickness, nWeights, pipeR, phaseShift, ks, sigma_ref, voxelToUm, cellMult, domain) {
  const isPi    = mode === 'pi-tpms';
  const isShell = mode === 'shell';
  const wt = wallThickness || 0.3;

  // PI-TPMS needs N=64 to resolve thin pipes at low VF.
  // N must be a power of 2 for the FFT solver.
  // Shell/solid work well at N=16.
  const N = isPi ? 64 : 16;

  const fft = fftHomogenize(terms, offset, N, isShell, wt, Es, nu, nWeights || null, isPi, pipeR, phaseShift);
  if (!fft) return {
    volume_fraction: 0, Ex_GPa: 0, Ey_GPa: 0, Ez_GPa: 0,
    anisotropy: 1, stiffness_density: 0, surface_complexity: 0,
    degenerate: true
  };

  const { rho, Ex: Ex_raw, Ey: Ey_raw, Ez: Ez_raw, solid: solidVox } = fft;

  const Ex = Math.max(0, Ex_raw);
  const Ey = Math.max(0, Ey_raw);
  const Ez = Math.max(0, Ez_raw);

  // Surface complexity
  const vSolid = new Uint8Array(N*N*N);
  const Lc = Math.PI, stepC = 2*Lc/N;
  for (let i = 0; i < N; i++) { const x2 = -Lc+(i+0.5)*stepC;
    for (let j = 0; j < N; j++) { const y2 = -Lc+(j+0.5)*stepC;
      for (let k = 0; k < N; k++) { const z2 = -Lc+(k+0.5)*stepC;
        vSolid[i*N*N+j*N+k] = evaluateTpms(terms,x2,y2,z2)-offset < 0 ? 1 : 0;
      }}}
  let faces = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    const v = vSolid[i*N*N+j*N+k];
    if (i+1<N && vSolid[(i+1)*N*N+j*N+k]!==v) faces++;
    if (j+1<N && vSolid[i*N*N+(j+1)*N+k]!==v) faces++;
    if (k+1<N && vSolid[i*N*N+j*N+k+1]!==v)   faces++;
  }
  const complexity = Math.min(1, faces / (N*N*3));

  // Anisotropy
  const connectedStiffnesses = [Ex, Ey, Ez].filter(E => E > 1e-6);
  let aniso = 1.0;
  if (connectedStiffnesses.length >= 2) {
    aniso = Math.max(...connectedStiffnesses) / Math.min(...connectedStiffnesses);
  } else if (connectedStiffnesses.length === 1) {
    aniso = 999;
  }

  const Emean3         = (Ex+Ey+Ez)/3;
  const aniso_efficiency = aniso / (rho+1e-9);
  const Emax           = Math.max(Ex,Ey,Ez);
  const axial_dominance = Emax / (Ex+Ey+Ez-Emax+1e-9);
  const variance       = ((Ex-Emean3)**2+(Ey-Emean3)**2+(Ez-Emean3)**2)/3;
  const ortho_contrast = Emean3>0 ? Math.sqrt(variance)/Emean3 : 0;
  const Es_ref         = Es || 100;
  const load_path_eff  = Emax / (rho * Es_ref + 1e-9);
  const stiff_axis     = Emax === Ex ? 'X' : Emax === Ey ? 'Y' : 'Z';
  const connect_idx    = +((+(Ex>1e-6) + +(Ey>1e-6) + +(Ez>1e-6)) / 3).toFixed(2);

  // Thermal — only when domain === 'thermal'
  let kx = 0, ky = 0, kz = 0, thermal_anisotropy = 1, k_density = 0;
  if (domain === 'thermal') {
    const ks_val = ks || 1.0;
    const kv_val = ks_val * 0.0003;
    const therm = thermalHomogenize(solidVox, N, ks_val, kv_val);
    kx = therm.kx; ky = therm.ky; kz = therm.kz;
    const kmax  = Math.max(kx, ky, kz);
    const kmean = (kx + ky + kz) / 3;
    thermal_anisotropy = kmax / (Math.min(kx,ky,kz) + 1e-9);
    k_density = rho > 0 ? kmean / rho : 0;
  }

  // Strain energy & microstrain
  const sig = (sigma_ref !== null && sigma_ref !== undefined) ? sigma_ref : Es_ref * 0.0001;
  const microstrain_x = Ex > 1e-6 ? +(sig / Ex * 1e6).toFixed(0) : 999999;
  const microstrain_y = Ey > 1e-6 ? +(sig / Ey * 1e6).toFixed(0) : 999999;
  const microstrain_z = Ez > 1e-6 ? +(sig / Ez * 1e6).toFixed(0) : 999999;
  const U_x = Ex > 1e-6 ? sig*sig/(2*Ex) : 0;
  const U_y = Ey > 1e-6 ? sig*sig/(2*Ey) : 0;
  const U_z = Ez > 1e-6 ? sig*sig/(2*Ez) : 0;
  const numConnected = (Ex>1e-6?1:0) + (Ey>1e-6?1:0) + (Ez>1e-6?1:0);
  const U_strain = numConnected > 0 ? +((U_x+U_y+U_z)/numConnected*1e6).toFixed(1) : 0;

  const validMicrostrains = [];
  if (Ex > 1e-6) validMicrostrains.push(microstrain_x);
  if (Ey > 1e-6) validMicrostrains.push(microstrain_y);
  if (Ez > 1e-6) validMicrostrains.push(microstrain_z);
  const microstrain_avg = validMicrostrains.length > 0
    ? Math.round(validMicrostrains.reduce((a,b) => a+b, 0) / validMicrostrains.length)
    : 999999;

  // Pore analysis
  const cm = cellMult || 1.0;
  const cellSizeMm = (voxelToUm || 62.5) * 32 / 1000;
  const pores = analyzePores(terms, offset, mode, wt, pipeR, phaseShift, cm, cellSizeMm, N);

  return {
    volume_fraction:    +(rho*100).toFixed(2),
    Ex_GPa:             +Ex.toFixed(2),
    Ey_GPa:             +Ey.toFixed(2),
    Ez_GPa:             +Ez.toFixed(2),
    anisotropy:         +Math.min(aniso,99).toFixed(2),
    stiffness_density:  +((Ex+Ey+Ez)/3/rho).toFixed(2),
    aniso_efficiency:   +Math.min(aniso_efficiency,999).toFixed(2),
    axial_dominance:    +Math.min(axial_dominance,99).toFixed(2),
    ortho_contrast:     +ortho_contrast.toFixed(3),
    load_path_eff:      +Math.min(load_path_eff,9.999).toFixed(3),
    stiff_axis,
    connect_idx,
    keff_x:             +kx.toFixed(3),
    keff_y:             +ky.toFixed(3),
    keff_z:             +kz.toFixed(3),
    thermal_anisotropy: +Math.min(thermal_anisotropy,99).toFixed(2),
    k_density:          +k_density.toFixed(3),
    U_strain,
    microstrain_x,
    microstrain_y,
    microstrain_z,
    microstrain_avg,
    pore_size:          pores.pore_size,
    throat_size:        pores.throat_size,
    perc_idx:           pores.perc_idx,
    surface_complexity: +complexity.toFixed(3),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB WORKER MESSAGE HANDLER
// Active only when this file is loaded as a Worker (not as a <script>).
// Detects worker context by checking for importScripts, which exists only
// in Worker scope — not in the main window.
// ═══════════════════════════════════════════════════════════════════════════
if (typeof importScripts === 'function') {
  self.onmessage = function(e) {
    const d = e.data;

    if (d.type === 'invalidate') {
      invalidateSolverCaches();
      return;
    }

    if (d.type === 'solve') {
      const result = estimateHomogenization(
        d.terms, d.offset, d.scaleX, d.scaleY, d.scaleZ,
        d.Es, d.nu, d.baseline, d.mode, d.wallThickness,
        d.nWeights, d.pipeR, d.phaseShift,
        d.ks, d.sigma_ref, d.voxelToUm, d.cellMult, d.domain
      );
      self.postMessage({ type: 'result', id: d.id, result });
    }
  };
}
