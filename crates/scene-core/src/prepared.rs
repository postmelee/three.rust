//! C3 retained topology and bounded ordinary-Mesh main-pass evaluation.
use super::{facade, with_scene};
use std::cmp::Ordering;
const META: usize = 16;
const OUT: usize = 32;
#[derive(Default)]
pub(crate) struct Plan {
    pub ops: Vec<u32>,
    pub meta: Vec<f64>,
    pub output: Vec<f64>,
    pub order: Vec<u32>,
    pub resources: Vec<u32>,
    pub camera: Vec<f64>,
}
#[no_mangle]
pub extern "C" fn prepared_new(id: u32, count: u32) -> u32 {
    if count == 0 || count > 1_000_000 {
        return 0;
    }
    with_scene(id, |s| {
        let n = count as usize;
        s.plans.push(Some(Plan {
            ops: vec![0; n * 7],
            meta: vec![0.0; n * META],
            output: vec![0.0; n * OUT],
            order: Vec::with_capacity(n),
            resources: Vec::with_capacity(n),
            camera: vec![0.0; 64],
        }));
        s.plans.len() as u32
    })
}
#[no_mangle]
pub extern "C" fn prepared_free(id: u32, plan: u32) {
    with_scene(id, |s| {
        if let Some(p) = plan
            .checked_sub(1)
            .and_then(|i| s.plans.get_mut(i as usize))
        {
            *p = None;
        }
    });
}
#[no_mangle]
pub extern "C" fn prepared_ptr(id: u32, plan: u32, kind: u32) -> usize {
    with_scene(id, |s| {
        match plan
            .checked_sub(1)
            .and_then(|i| s.plans.get_mut(i as usize))
            .and_then(Option::as_mut)
        {
            Some(p) => match kind {
                0 => p.ops.as_mut_ptr() as usize,
                1 => p.meta.as_mut_ptr() as usize,
                2 => p.output.as_mut_ptr() as usize,
                3 => p.order.as_mut_ptr() as usize,
                4 => p.camera.as_mut_ptr() as usize,
                5 => p.resources.as_mut_ptr() as usize,
                _ => 0,
            },
            None => 0,
        }
    })
}
#[no_mangle]
pub extern "C" fn facade_update_versions(id: u32, count: u32) -> u32 {
    with_scene(id, |s| {
        facade::update_versions(&mut s.data, &s.ops, count as usize) as u32
    })
}
#[no_mangle]
pub extern "C" fn prepared_update(id: u32, plan: u32, force: u32) -> u32 {
    if force > 1 {
        return 0;
    }
    with_scene(id, |s| {
        let Some(p) = plan
            .checked_sub(1)
            .and_then(|i| s.plans.get_mut(i as usize))
            .and_then(Option::as_mut)
        else {
            return 0;
        };
        p.ops[4] = force;
        facade::update_versions(&mut s.data, &p.ops, p.ops.len() / 7) as u32
    })
}
#[no_mangle]
pub extern "C" fn prepared_pass(id: u32, plan: u32) -> u32 {
    with_scene(id, |s| {
        let Some(p) = plan
            .checked_sub(1)
            .and_then(|i| s.plans.get_mut(i as usize))
            .and_then(Option::as_mut)
        else {
            return 0;
        };
        if !evaluate(&s.data, p) {
            return 0;
        }
        p.order.len() as u32 + 1
    })
}
fn compare(meta: &[f64], out: &[f64], a: u32, b: u32) -> Ordering {
    let a = a as usize;
    let b = b as usize;
    let am = a * META;
    let bm = b * META;
    let transparent = meta[am + 13] != 0.0;
    for (x, y) in [
        (meta[am + 13], meta[bm + 13]),
        (out[a * OUT + 26], out[b * OUT + 26]),
        (meta[am + 6], meta[bm + 6]),
    ] {
        if x != y {
            return x.partial_cmp(&y).unwrap_or(Ordering::Equal);
        }
    }
    if !transparent && meta[am + 12] != meta[bm + 12] {
        return meta[am + 12]
            .partial_cmp(&meta[bm + 12])
            .unwrap_or(Ordering::Equal);
    }
    let az = out[a * OUT + 25];
    let bz = out[b * OUT + 25];
    if az != bz {
        return if transparent {
            bz.partial_cmp(&az)
        } else {
            az.partial_cmp(&bz)
        }
        .unwrap_or(Ordering::Equal);
    }
    meta[am + 7]
        .partial_cmp(&meta[bm + 7])
        .unwrap_or(Ordering::Equal)
}
fn evaluate(d: &[f64], p: &mut Plan) -> bool {
    let n = p.meta.len() / META;
    for i in 0..n {
        let m = i * META;
        let slot = p.meta[m];
        let parent = p.meta[m + 2];
        if !slot.is_finite()
            || slot < 1.0
            || slot.fract() != 0.0
            || slot as usize >= d.len() / 64
            || d[slot as usize * 64 + 50] != p.meta[m + 1]
            || p.meta[m + 1] <= 0.0
            || !parent.is_finite()
            || parent < 0.0
            || parent.fract() != 0.0
            || parent > i as f64
        {
            return false;
        }
    }
    p.order.clear();
    p.resources.clear();
    let c = &p.camera;
    let meta = &p.meta;
    let out = &mut p.output;
    for i in 0..n {
        let m = i * META;
        let o = i * OUT;
        let b = meta[m] as usize * 64 + 32;
        let parent = meta[m + 2] as usize;
        let visible = meta[m + 3] != 0.0 && (parent == 0 || out[(parent - 1) * OUT + 27] != 0.0);
        let layer = meta[m + 4] as u32 & c[56] as u32 != 0;
        let group = if meta[m + 5] == 1.0 && layer {
            meta[m + 6]
        } else if parent > 0 {
            out[(parent - 1) * OUT + 26]
        } else {
            0.0
        };
        out[o + 26] = group;
        out[o + 27] = if visible { 1.0 } else { 0.0 };
        out[o + 28] = 0.0;
        if !visible || !layer || meta[m + 5] != 2.0 {
            continue;
        }
        let x = meta[m + 8];
        let y = meta[m + 9];
        let z = meta[m + 10];
        // Vector3/Sphere use the affine/projective point divide; depth uses Vector4.
        let w = 1.0 / (d[b + 3] * x + d[b + 7] * y + d[b + 11] * z + d[b + 15]);
        let cx = (d[b] * x + d[b + 4] * y + d[b + 8] * z + d[b + 12]) * w;
        let cy = (d[b + 1] * x + d[b + 5] * y + d[b + 9] * z + d[b + 13]) * w;
        let cz = (d[b + 2] * x + d[b + 6] * y + d[b + 10] * z + d[b + 14]) * w;
        let mut max_scale = 0.0_f64;
        for col in 0..3 {
            let k = b + col * 4;
            max_scale = max_scale.max(d[k] * d[k] + d[k + 1] * d[k + 1] + d[k + 2] * d[k + 2]);
        }
        let radius = meta[m + 11] * max_scale.sqrt();
        let mut culled = false;
        if meta[m + 15] != 0.0 {
            for plane in 0..6 {
                let k = 32 + plane * 4;
                if c[k] * cx + c[k + 1] * cy + c[k + 2] * cz + c[k + 3] < -radius {
                    culled = true;
                    break;
                }
            }
        }
        if culled {
            continue;
        }
        p.resources.push(i as u32);
        out[o + 28] = 1.0; // Resource updates occur even for invisible materials, as upstream.
        if meta[m + 14] == 0.0 {
            continue;
        }
        let vx = d[b] * x + d[b + 4] * y + d[b + 8] * z + d[b + 12];
        let vy = d[b + 1] * x + d[b + 5] * y + d[b + 9] * z + d[b + 13];
        let vz = d[b + 2] * x + d[b + 6] * y + d[b + 10] * z + d[b + 14];
        let vw = d[b + 3] * x + d[b + 7] * y + d[b + 11] * z + d[b + 15];
        out[o + 25] = (c[18] * vx + c[22] * vy + c[26] * vz + c[30] * vw)
            * if c[58] != 0.0 { -1.0 } else { 1.0 };
        for col in 0..4 {
            for row in 0..4 {
                out[o + col * 4 + row] = c[row] * d[b + col * 4]
                    + c[4 + row] * d[b + col * 4 + 1]
                    + c[8 + row] * d[b + col * 4 + 2]
                    + c[12 + row] * d[b + col * 4 + 3];
            }
        }
        normal(out, o);
        p.order.push(i as u32);
    }
    if c[57] != 0.0 {
        p.order.sort_by(|a, b| compare(meta, out, *a, *b));
    }
    p.camera[59] = p.resources.len() as f64;
    true
}
fn normal(d: &mut [f64], b: usize) {
    let (a, b1, c, e, f, g, h, i, j) = (
        d[b],
        d[b + 1],
        d[b + 2],
        d[b + 4],
        d[b + 5],
        d[b + 6],
        d[b + 8],
        d[b + 9],
        d[b + 10],
    );
    let t11 = j * f - g * i;
    let t12 = g * h - j * e;
    let t13 = i * e - f * h;
    let det = a * t11 + b1 * t12 + c * t13;
    if det == 0.0 {
        d[b + 16..b + 25].fill(0.0);
        return;
    }
    let q = 1.0 / det;
    // Transposed inverse, column-major; identical arithmetic to Matrix3.
    let v = [
        t11 * q,
        t12 * q,
        t13 * q,
        (c * i - j * b1) * q,
        (j * a - c * h) * q,
        (b1 * h - i * a) * q,
        (g * b1 - c * f) * q,
        (c * e - g * a) * q,
        (f * a - b1 * e) * q,
    ];
    d[b + 16..b + 25].copy_from_slice(&v);
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn singular_and_normal_matrix() {
        let mut d = vec![0.0; 32];
        normal(&mut d, 0);
        assert_eq!(&d[16..25], &[0.0; 9]);
        d[0] = 2.0;
        d[5] = 4.0;
        d[10] = 5.0;
        normal(&mut d, 0);
        assert_eq!((d[16], d[20], d[24]), (0.5, 0.25, 0.2));
    }
    #[test]
    fn invalid_plan_does_not_touch_output() {
        let d = vec![0.0; 128];
        let mut p = Plan {
            meta: vec![0.0; 16],
            output: vec![42.0; 32],
            ..Plan::default()
        };
        assert!(!evaluate(&d, &mut p));
        assert_eq!(p.output, vec![42.0; 32]);
    }
    #[test]
    fn ordering_matches_material_and_transparent_depth() {
        let mut m = vec![0.0; 48];
        let mut o = vec![0.0; 96];
        m[7] = 3.0;
        m[23] = 2.0;
        m[39] = 1.0;
        m[12] = 9.0;
        m[28] = 8.0;
        assert_eq!(compare(&m, &o, 0, 1), Ordering::Greater);
        m[13] = 1.0;
        m[29] = 1.0;
        o[25] = 1.0;
        o[57] = 2.0;
        assert_eq!(compare(&m, &o, 0, 1), Ordering::Greater);
    }
}
