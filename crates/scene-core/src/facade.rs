//! C2 indexed persistent state. Public matrix snapshots are not imported on each tick.
//! Operations: [slot, generation, parent, parent_generation, force, inherited_op+1, local_only].
//! State uses the legacy 64-f64 stride: generation 50, output mask 51, compose-dirty 54.
use super::{compose, with_scene, STRIDE};
const OP: usize = 7;

#[no_mangle]
pub extern "C" fn facade_reserve_ops(id: u32, capacity: u32) -> u32 {
    if capacity > 1_000_000 {
        return 0;
    }
    with_scene(id, |s| {
        s.ops.resize(capacity as usize * OP, 0);
        1
    })
}
#[no_mangle]
pub extern "C" fn facade_ops_ptr(id: u32) -> *mut u32 {
    with_scene(id, |s| s.ops.as_mut_ptr())
}
#[no_mangle]
pub extern "C" fn facade_update(id: u32, count: u32) -> u32 {
    with_scene(id, |s| {
        if !update(&mut s.data, &s.ops, count as usize) {
            return 0;
        }
        s.calls = s.calls.wrapping_add(1);
        s.nodes = s.nodes.wrapping_add(count);
        1
    })
}
fn update(d: &mut [f64], ops: &[u32], count: usize) -> bool {
    if count > ops.len() / OP {
        return false;
    }
    let valid = |slot: u32, generation: u32| {
        slot > 0
            && (slot as usize) < d.len() / STRIDE
            && generation > 0
            && d[slot as usize * STRIDE + 50] == generation as f64
    };
    // Check the complete command buffer before changing evaluated state.
    for i in 0..count {
        let q = &ops[i * OP..(i + 1) * OP];
        if !valid(q[0], q[1])
            || q[0] == q[2]
            || (q[2] != 0 && !valid(q[2], q[3]))
            || q[4] > 1
            || q[6] > 1
            || q[5] as usize > i
            || (q[5] != 0 && ops[(q[5] as usize - 1) * OP] != q[2])
        {
            return false;
        }
    }
    for i in 0..count {
        let q = &ops[i * OP..(i + 1) * OP];
        let b = q[0] as usize * STRIDE;
        let p = q[2] as usize * STRIDE;
        let flags = d[b + 15] as u32;
        let local_only = q[6] != 0;
        let auto = flags & 1 != 0 || local_only;
        let mut mask = 0;
        if auto && d[b + 54] != 0.0 {
            compose(d, b);
            d[b + 54] = 0.0;
            mask |= 1;
        }
        if local_only {
            d[b + 15] = (flags | 4) as f64;
            d[b + 51] = mask as f64;
            continue;
        }
        let changed = auto || flags & 4 != 0 || q[4] != 0 || (q[5] != 0 && d[p + 48] != 0.0);
        if changed && flags & 2 != 0 {
            if d[b + 49] == 0.0 {
                for j in 0..16 {
                    d[b + 32 + j] = d[b + 16 + j];
                }
            } else {
                for col in 0..4 {
                    for row in 0..4 {
                        d[b + 32 + col * 4 + row] = d[p + 32 + row] * d[b + 16 + col * 4]
                            + d[p + 36 + row] * d[b + 17 + col * 4]
                            + d[p + 40 + row] * d[b + 18 + col * 4]
                            + d[p + 44 + row] * d[b + 19 + col * 4];
                    }
                }
            }
            mask |= 2;
        }
        d[b + 48] = if changed { 1.0 } else { 0.0 };
        d[b + 51] = mask as f64;
        if changed {
            d[b + 15] = (flags & !4) as f64;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    fn state() -> Vec<f64> {
        let mut d = vec![0.0; 3 * STRIDE];
        for b in [64, 128] {
            d[b + 6] = 1.0;
            d[b + 7..b + 10].fill(1.0);
            d[b + 15] = 3.0;
            d[b + 50] = 1.0;
            d[b + 54] = 1.0;
        }
        d[128 + 49] = 1.0;
        d
    }
    #[test]
    fn indexed_state_survives_reordering_and_partial_updates() {
        let mut d = state();
        d[64] = 3.0;
        d[128] = 2.0;
        let ops = [1, 1, 0, 0, 0, 0, 0, 2, 1, 1, 1, 0, 1, 0];
        assert!(update(&mut d, &ops, 2));
        assert_eq!(d[128 + 44], 5.0);
        d[128] = 4.0;
        d[128 + 54] = 1.0;
        assert!(update(&mut d, &[2, 1, 1, 1, 0, 0, 0], 1));
        assert_eq!(d[128 + 44], 7.0);
        assert_eq!(d[64 + 44], 3.0);
        assert!(update(&mut d, &ops, 2));
        assert_eq!(d[128 + 51], 2.0);
    }
    #[test]
    fn generations_and_invalid_commands_are_atomic() {
        let mut d = state();
        let before = d.clone();
        for ops in [
            [1, 2, 0, 0, 0, 0, 0],
            [1, 1, 2, 2, 0, 0, 0],
            [1, 1, 0, 0, 0, 1, 0],
            [4, 1, 0, 0, 0, 0, 0],
        ] {
            assert!(!update(&mut d, &ops, 1));
            assert_eq!(d, before);
        }
        d[64 + 50] = 0.0;
        assert!(!update(&mut d, &[1, 1, 0, 0, 0, 0, 0], 1));
    }
    #[test]
    fn local_only_and_force_preserve_upstream_flags() {
        let mut d = state();
        d[64] = 9.0;
        d[64 + 15] = 2.0;
        assert!(update(&mut d, &[1, 1, 0, 0, 0, 0, 1], 1));
        assert_eq!(d[64 + 28], 9.0);
        assert_eq!(d[64 + 44], 0.0);
        assert_eq!(d[64 + 15], 6.0);
        assert!(update(&mut d, &[1, 1, 0, 0, 0, 0, 0], 1));
        assert_eq!(d[64 + 44], 9.0);
        assert_eq!(d[64 + 15], 2.0);
        d[64 + 44] = 42.0;
        assert!(update(&mut d, &[1, 1, 0, 0, 0, 0, 0], 1));
        assert_eq!(d[64 + 44], 42.0);
        assert!(update(&mut d, &[1, 1, 0, 0, 1, 0, 0], 1));
        assert_eq!(d[64 + 44], 9.0);
    }
}
