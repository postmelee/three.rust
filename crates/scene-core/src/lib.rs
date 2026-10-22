//! Persistent f64 transform arenas. No JS imports, renderer calls, or per-value ABI.
//! Layout is shared with packages/rthree/runtime.js; slot 0 is external parent.
use std::cell::RefCell;
const STRIDE: usize = 64;
#[derive(Default)]
struct Scene {
    data: Vec<f64>,
    calls: u32,
    nodes: u32,
}
thread_local! { static SCENES: RefCell<Vec<Option<Scene>>> = const { RefCell::new(Vec::new()) }; }

// Handles are monotonic and never reused. A released handle cannot alias a new scene.
#[no_mangle]
pub extern "C" fn scene_new() -> u32 {
    SCENES.with(|s| {
        let mut s = s.borrow_mut();
        s.push(Some(Scene::default()));
        s.len() as u32
    })
}
fn with_scene<T: Default>(id: u32, f: impl FnOnce(&mut Scene) -> T) -> T {
    SCENES.with(|s| {
        let mut s = s.borrow_mut();
        match id
            .checked_sub(1)
            .and_then(|i| s.get_mut(i as usize))
            .and_then(Option::as_mut)
        {
            Some(scene) => f(scene),
            None => T::default(),
        }
    })
}
#[no_mangle]
pub extern "C" fn scene_resize(id: u32, capacity: u32) -> u32 {
    if capacity > 1_000_000 {
        return 0;
    }
    with_scene(id, |s| {
        s.data.resize((capacity as usize + 1) * STRIDE, 0.0);
        1
    })
}
#[no_mangle]
pub extern "C" fn scene_ptr(id: u32) -> *mut f64 {
    with_scene(id, |s| s.data.as_mut_ptr())
}
#[no_mangle]
pub extern "C" fn scene_free(id: u32) {
    SCENES.with(|s| {
        if let Some(slot) = id
            .checked_sub(1)
            .and_then(|i| s.borrow_mut().get_mut(i as usize).map(Option::take))
        {
            drop(slot);
        }
    });
}
#[no_mangle]
pub extern "C" fn scene_calls(id: u32) -> u32 {
    with_scene(id, |s| s.calls)
}
#[no_mangle]
pub extern "C" fn scene_nodes(id: u32) -> u32 {
    with_scene(id, |s| s.nodes)
}
#[no_mangle]
pub extern "C" fn scene_update(id: u32, count: u32, force: u32) -> u32 {
    with_scene(id, |s| {
        let n = count as usize;
        if !update(&mut s.data, n, force != 0) {
            return 0;
        }
        s.calls = s.calls.wrapping_add(1);
        s.nodes = s.nodes.wrapping_add(count);
        1
    })
}
fn compose(d: &mut [f64], o: usize) {
    let (x, y, z, w) = (d[o + 3], d[o + 4], d[o + 5], d[o + 6]);
    let (x2, y2, z2) = (x + x, y + y, z + z);
    let (xx, xy, xz, yy, yz, zz, wx, wy, wz) = (
        x * x2,
        x * y2,
        x * z2,
        y * y2,
        y * z2,
        z * z2,
        w * x2,
        w * y2,
        w * z2,
    );
    let (sx, sy, sz) = (d[o + 7], d[o + 8], d[o + 9]);
    let m = o + 16;
    d[m] = (1.0 - (yy + zz)) * sx;
    d[m + 1] = (xy + wz) * sx;
    d[m + 2] = (xz - wy) * sx;
    d[m + 3] = 0.0;
    d[m + 4] = (xy - wz) * sy;
    d[m + 5] = (1.0 - (xx + zz)) * sy;
    d[m + 6] = (yz + wx) * sy;
    d[m + 7] = 0.0;
    d[m + 8] = (xz + wy) * sz;
    d[m + 9] = (yz - wx) * sz;
    d[m + 10] = (1.0 - (xx + yy)) * sz;
    d[m + 11] = 0.0;
    d[m + 12] = d[o];
    d[m + 13] = d[o + 1];
    d[m + 14] = d[o + 2];
    d[m + 15] = 1.0;
    if d[o + 13] != 0.0 {
        let (px, py, pz) = (d[o + 10], d[o + 11], d[o + 12]);
        d[m + 12] += px - d[m] * px - d[m + 4] * py - d[m + 8] * pz;
        d[m + 13] += py - d[m + 1] * px - d[m + 5] * py - d[m + 9] * pz;
        d[m + 14] += pz - d[m + 2] * px - d[m + 6] * py - d[m + 10] * pz;
    }
}
fn update(d: &mut [f64], n: usize, force: bool) -> bool {
    if (n + 1) * STRIDE > d.len() {
        return false;
    }
    // Validate topology before mutating. Every parent must precede its child.
    for i in 1..=n {
        let p = d[i * STRIDE + 14];
        if !p.is_finite() || p < 0.0 || p.fract() != 0.0 || p >= i as f64 {
            return false;
        }
    }
    d[48] = if force { 1.0 } else { 0.0 };
    for i in 1..=n {
        let o = i * STRIDE;
        let p = d[o + 14] as usize * STRIDE;
        let flags = d[o + 15] as u32;
        let auto = flags & 1 != 0;
        if auto {
            compose(d, o);
        }
        let changed = auto || flags & 4 != 0 || d[p + 48] != 0.0;
        if changed && flags & 2 != 0 {
            if i == 1 && d[o + 49] == 0.0 {
                for j in 0..16 {
                    d[o + 32 + j] = d[o + 16 + j];
                }
            } else {
                for col in 0..4 {
                    for row in 0..4 {
                        d[o + 32 + col * 4 + row] = d[p + 32 + row] * d[o + 16 + col * 4]
                            + d[p + 36 + row] * d[o + 17 + col * 4]
                            + d[p + 40 + row] * d[o + 18 + col * 4]
                            + d[p + 44 + row] * d[o + 19 + col * 4];
                    }
                }
            }
        }
        d[o + 48] = if changed { 1.0 } else { 0.0 };
        if changed {
            d[o + 15] = (flags & !4) as f64;
        }
    }
    true
}
#[cfg(test)]
mod tests {
    use super::*;
    fn data(n: usize) -> Vec<f64> {
        let mut d = vec![0.0; (n + 1) * STRIDE];
        for i in 1..=n {
            let o = i * STRIDE;
            d[o + 6] = 1.0;
            d[o + 7..o + 10].fill(1.0);
            d[o + 15] = 3.0;
        }
        d
    }
    #[test]
    fn hierarchy_and_persistence() {
        let mut d = data(2);
        d[64] = 2.0;
        d[128] = 3.0;
        d[128 + 14] = 1.0;
        assert!(update(&mut d, 2, false));
        assert_eq!(d[128 + 44], 5.0);
        d[64] = 7.0;
        update(&mut d, 2, false);
        assert_eq!(d[128 + 44], 10.0);
    }
    #[test]
    fn manual_world_and_force() {
        let mut d = data(2);
        d[64 + 15] = 4.0;
        d[64 + 44] = 9.0;
        for j in [0, 5, 10, 15] {
            d[64 + 32 + j] = 1.0;
        }
        d[128 + 14] = 1.0;
        d[128] = 2.0;
        update(&mut d, 2, true);
        assert_eq!(d[64 + 44], 9.0);
        assert_eq!(d[128 + 44], 11.0);
    }
    #[test]
    fn pivot_and_negative_scale() {
        let mut d = data(1);
        d[64 + 7] = -2.0;
        d[64 + 10] = 3.0;
        d[64 + 13] = 1.0;
        update(&mut d, 1, false);
        assert_eq!(d[64 + 28], 9.0);
        assert_eq!(d[64 + 16], -2.0);
    }
    #[test]
    fn rejects_bad_topology() {
        let mut d = data(1);
        d[64 + 14] = 1.0;
        assert!(!update(&mut d, 1, false));
        d[64 + 14] = f64::NAN;
        assert!(!update(&mut d, 1, false));
    }
    #[test]
    fn stale_handles_and_growth() {
        let a = scene_new();
        assert_eq!(scene_resize(a, 1), 1);
        assert!(!scene_ptr(a).is_null());
        assert_eq!(scene_resize(a, 1000), 1);
        scene_free(a);
        assert_eq!(scene_resize(a, 2), 0);
        assert!(scene_ptr(a).is_null());
        let b = scene_new();
        assert_ne!(a, b);
        scene_free(b);
    }
}
