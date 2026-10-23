//! Finite explicit-ownership animation domain. No JavaScript imports.
use std::cell::RefCell;
const COMMAND: usize = 20;
const MAX_COMMANDS: usize = 256;
struct Track {
    clip: usize,
    node: usize,
    kind: usize,
    times: Vec<f64>,
    values: Vec<f64>,
}
struct Owned {
    n: usize,
    r: usize,
    c: usize,
    parents: Vec<f64>,
    base: Vec<f64>,
    inverse: Vec<f64>,
    roots: Vec<f64>,
    durations: Vec<f64>,
    tracks: Vec<Track>,
    pose: Vec<f64>,
    world: Vec<f64>,
    palette: Vec<f32>,
    actions: Vec<f64>,
    weights: Vec<f64>,
    commands: Vec<f64>,
    steps: u32,
}
struct Reader<'a> {
    d: &'a [f64],
    offset: usize,
}
impl Reader<'_> {
    fn take(&mut self, n: usize) -> Option<&[f64]> {
        let end = self.offset.checked_add(n)?;
        let result = self.d.get(self.offset..end)?;
        self.offset = end;
        Some(result)
    }
    fn int(&mut self, max: usize) -> Option<usize> {
        let value = self.take(1)?[0];
        if value < 0.0 || value.fract() != 0.0 || value > max as f64 {
            None
        } else {
            Some(value as usize)
        }
    }
}
fn quaternion(q: &[f64]) -> bool {
    (q.iter().map(|v| v * v).sum::<f64>().sqrt() - 1.0).abs() <= 1e-5
}
fn matrix(m: &[f64]) -> bool {
    m.len() == 16
        && m[3] == 0.0
        && m[7] == 0.0
        && m[11] == 0.0
        && m[15] == 1.0
        && (m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2])
            + m[8] * (m[1] * m[6] - m[5] * m[2]))
            .abs()
            >= 1e-12
}
fn index(x: f64, max: usize) -> bool {
    x >= 0.0 && x.fract() == 0.0 && x < (max as f64)
}
impl Owned {
    fn parse(d: &[f64]) -> Option<Self> {
        if !d.iter().all(|v| v.is_finite()) {
            return None;
        }
        let mut rd = Reader { d, offset: 0 };
        let n = rd.int(512)?;
        let r = rd.int(256)?;
        let c = rd.int(32)?;
        let count = rd.int(n * c * 3)?;
        if n == 0 || r == 0 || c == 0 {
            return None;
        }
        let p = rd.take(n)?.to_vec();
        if p.iter()
            .enumerate()
            .any(|(i, &x)| x < -1.0 || x >= i as f64 || x.fract() != 0.0)
        {
            return None;
        }
        let rest = rd.take(n * 10)?.to_vec();
        if rest.chunks_exact(10).any(|x| !quaternion(&x[3..7])) {
            return None;
        }
        let inverse = rd.take(n * 16)?.to_vec();
        if inverse.chunks_exact(16).any(|x| !matrix(x)) {
            return None;
        }
        let roots = rd.take(r * 16)?.to_vec();
        if roots.chunks_exact(16).any(|x| !matrix(x)) {
            return None;
        }
        let durations = rd.take(c)?.to_vec();
        if durations.iter().any(|&x| x <= 0.0 || x > 1e6) {
            return None;
        }
        let mut tracks = Vec::with_capacity(count);
        let mut seen = vec![false; c * n * 3];
        for _ in 0..count {
            let clip = rd.int(c - 1)?;
            let node = rd.int(n - 1)?;
            let kind = rd.int(2)?;
            let k = rd.int(10000)?;
            if k == 0 {
                return None;
            }
            let binding = (clip * n + node) * 3 + kind;
            if seen[binding] {
                return None;
            }
            seen[binding] = true;
            let times = rd.take(k)?.to_vec();
            if times
                .iter()
                .enumerate()
                .any(|(i, &x)| x < 0.0 || x > durations[clip] || (i > 0 && x <= times[i - 1]))
            {
                return None;
            }
            let size = if kind == 1 { 4 } else { 3 };
            let values = rd.take(k * size)?.to_vec();
            if kind == 1 && values.chunks_exact(4).any(|x| !quaternion(x)) {
                return None;
            }
            tracks.push(Track {
                clip,
                node,
                kind,
                times,
                values,
            });
        }
        if rd.offset != d.len() {
            return None;
        }
        let mut actions = vec![0.0; r * c * 5];
        for a in actions.chunks_exact_mut(5) {
            a[2] = 1.0;
        }
        Some(Self {
            n,
            r,
            c,
            parents: p.repeat(r),
            base: rest.repeat(r),
            inverse,
            roots,
            durations,
            tracks,
            pose: vec![0.0; r * n * 10],
            world: vec![0.0; r * n * 16],
            palette: vec![0.0; r * n * 16],
            actions,
            weights: vec![0.0; n * 3],
            commands: vec![0.0; MAX_COMMANDS * COMMAND],
            steps: 0,
        })
    }
    fn commands(&mut self, count: usize) -> bool {
        if count > MAX_COMMANDS {
            return false;
        }
        for d in self.commands[..count * COMMAND].chunks_exact(COMMAND) {
            if !d.iter().all(|x| x.is_finite()) || !index(d[0], 7) || !index(d[1], self.r) {
                return false;
            }
            let kind = d[0] as usize;
            if kind < 4 && !index(d[2], self.c) {
                return false;
            }
            if kind == 0
                && (d[3] < 0.0
                    || d[3] > 1e6
                    || d[4] < 0.0
                    || d[4] > 1e6
                    || d[5].abs() > 1e6
                    || !index(d[6], 2)
                    || !index(d[7], 2))
            {
                return false;
            }
            if (kind == 1 || kind == 2) && (d[3] < 0.0 || d[3] > 1e6) {
                return false;
            }
            if kind == 3 && !index(d[3], 2) {
                return false;
            }
            if kind == 4 && !matrix(&d[2..18]) {
                return false;
            }
            if kind >= 5 && !index(d[2], self.n) {
                return false;
            }
            if kind == 5 && !quaternion(&d[6..10]) {
                return false;
            }
            if kind == 6 && (d[3] < -1.0 || d[3] >= d[2] || d[3].fract() != 0.0) {
                return false;
            }
        }
        for d in self.commands[..count * COMMAND].chunks_exact(COMMAND) {
            let rig = d[1] as usize;
            let id = d[2] as usize;
            let a = if d[0] < 4.0 {
                (rig * self.c + id) * 5
            } else {
                0
            };
            match d[0] as u32 {
                0 => self.actions[a..a + 5].copy_from_slice(&d[3..8]),
                1 => self.actions[a + 1] = d[3],
                2 => self.actions[a] = d[3],
                3 => self.actions[a + 3] = d[3],
                4 => self.roots[rig * 16..rig * 16 + 16].copy_from_slice(&d[2..18]),
                5 => {
                    let b = (rig * self.n + id) * 10;
                    self.base[b..b + 10].copy_from_slice(&d[3..13]);
                }
                6 => self.parents[rig * self.n + id] = d[3],
                _ => unreachable!(),
            }
        }
        true
    }
    fn step(&mut self, dt: f64) -> bool {
        if !dt.is_finite() || dt.abs() > 1e6 {
            return false;
        }
        for rig in 0..self.r {
            for ci in 0..self.c {
                let a = (rig * self.c + ci) * 5;
                let duration = self.durations[ci];
                if self.actions[a + 3] == 0.0 && dt * self.actions[a + 2] != 0.0 {
                    let mut time = self.actions[a] + dt * self.actions[a + 2];
                    if self.actions[a + 4] != 0.0 {
                        if time >= duration || time < 0.0 {
                            time = time.max(0.0).min(duration);
                            self.actions[a + 3] = 1.0;
                        }
                    } else {
                        time -= (time / duration).floor() * duration;
                    }
                    self.actions[a] = time;
                }
            }
            let start = rig * self.n * 10;
            self.pose[start..start + self.n * 10]
                .copy_from_slice(&self.base[start..start + self.n * 10]);
            self.weights.fill(0.0);
            for track in &self.tracks {
                let a = (rig * self.c + track.clip) * 5;
                let weight = self.actions[a + 1];
                if weight == 0.0 {
                    continue;
                }
                let time = self.actions[a];
                let size = if track.kind == 1 { 4 } else { 3 };
                let k = track.times.len();
                let (mut lo, mut hi) = (0, k - 1);
                while lo < hi {
                    let mid = (lo + hi) / 2;
                    if track.times[mid] <= time {
                        lo = mid + 1;
                    } else {
                        hi = mid;
                    }
                }
                let right = lo;
                let left = right.saturating_sub(1);
                let t = if track.times[right] > track.times[left] {
                    ((time - track.times[left]) / (track.times[right] - track.times[left]))
                        .clamp(0.0, 1.0)
                } else {
                    0.0
                };
                let mut sample = [0.0; 4];
                if time >= track.times[k - 1] {
                    sample[..size].copy_from_slice(&track.values[(k - 1) * size..k * size]);
                } else if track.kind == 1 {
                    sample = slerp(
                        &track.values[left * 4..left * 4 + 4],
                        &track.values[right * 4..right * 4 + 4],
                        t,
                    );
                } else {
                    for (j, x) in sample[..size].iter_mut().enumerate() {
                        *x = track.values[left * size + j] * (1.0 - t)
                            + track.values[right * size + j] * t;
                    }
                }
                let wi = track.node * 3 + track.kind;
                let old = self.weights[wi];
                let total = old + weight;
                self.weights[wi] = total;
                let b = (rig * self.n + track.node) * 10 + [0, 3, 7][track.kind];
                if old == 0.0 {
                    self.pose[b..b + size].copy_from_slice(&sample[..size]);
                } else if track.kind == 1 {
                    let q = slerp(&self.pose[b..b + 4], &sample, weight / total);
                    self.pose[b..b + 4].copy_from_slice(&q);
                } else {
                    let t = weight / total;
                    for (j, x) in sample[..size].iter().enumerate() {
                        self.pose[b + j] = self.pose[b + j] * (1.0 - t) + x * t;
                    }
                }
            }
            for node in 0..self.n {
                let b = (rig * self.n + node) * 10;
                for kind in 0..3 {
                    let weight = self.weights[node * 3 + kind];
                    if weight > 0.0 && weight < 1.0 {
                        let o = b + [0, 3, 7][kind];
                        if kind == 1 {
                            let q = slerp(&self.pose[o..o + 4], &self.base[o..o + 4], 1.0 - weight);
                            self.pose[o..o + 4].copy_from_slice(&q);
                        } else {
                            for j in 0..3 {
                                self.pose[o + j] =
                                    self.pose[o + j] * weight + self.base[o + j] * (1.0 - weight);
                            }
                        }
                    }
                }
                let mut scratch = [0.0; 64];
                scratch[..10].copy_from_slice(&self.pose[b..b + 10]);
                super::compose(&mut scratch, 0);
                let m = (rig * self.n + node) * 16;
                let parent = self.parents[rig * self.n + node];
                let world = if parent < 0.0 {
                    multiply(&self.roots[rig * 16..rig * 16 + 16], &scratch[16..32])
                } else {
                    let p = (rig * self.n + parent as usize) * 16;
                    multiply(&self.world[p..p + 16], &scratch[16..32])
                };
                self.world[m..m + 16].copy_from_slice(&world);
                let palette = multiply(&world, &self.inverse[node * 16..node * 16 + 16]);
                for (j, x) in palette.iter().enumerate() {
                    self.palette[m + j] = *x as f32;
                }
            }
        }
        self.steps = self.steps.wrapping_add(1);
        true
    }
}
fn multiply(a: &[f64], b: &[f64]) -> [f64; 16] {
    let mut out = [0.0; 16];
    for col in 0..4 {
        for row in 0..4 {
            out[col * 4 + row] = a[row] * b[col * 4]
                + a[4 + row] * b[col * 4 + 1]
                + a[8 + row] * b[col * 4 + 2]
                + a[12 + row] * b[col * 4 + 3];
        }
    }
    out
}
fn slerp(a: &[f64], b: &[f64], mut t: f64) -> [f64; 4] {
    let mut out = [a[0], a[1], a[2], a[3]];
    let mut other = [b[0], b[1], b[2], b[3]];
    if out != other {
        let mut dot = out.iter().zip(other).map(|(x, y)| x * y).sum::<f64>();
        if dot < 0.0 {
            for x in &mut other {
                *x = -*x;
            }
            dot = -dot;
        }
        let mut s = 1.0 - t;
        if dot < 0.9995 {
            let theta = dot.acos();
            let sin = theta.sin();
            s = (s * theta).sin() / sin;
            t = (t * theta).sin() / sin;
            for i in 0..4 {
                out[i] = out[i] * s + other[i] * t;
            }
        } else {
            for i in 0..4 {
                out[i] = out[i] * s + other[i] * t;
            }
            let factor = 1.0 / out.iter().map(|x| x * x).sum::<f64>().sqrt();
            for x in &mut out {
                *x *= factor;
            }
        }
    }
    out
}
#[derive(Default)]
struct Handle {
    input: Vec<f64>,
    core: Option<Owned>,
}
thread_local! {static OWNED:RefCell<Vec<Option<Handle>>>=const{RefCell::new(Vec::new())};}
fn with<T: Default>(id: u32, f: impl FnOnce(&mut Handle) -> T) -> T {
    OWNED.with(|registry| {
        let mut registry = registry.borrow_mut();
        match id
            .checked_sub(1)
            .and_then(|i| registry.get_mut(i as usize))
            .and_then(Option::as_mut)
        {
            Some(h) => f(h),
            None => T::default(),
        }
    })
}
#[no_mangle]
pub extern "C" fn owned_new(len: u32) -> u32 {
    if !(4..=16_000_000).contains(&len) {
        return 0;
    }
    OWNED.with(|r| {
        let mut r = r.borrow_mut();
        r.push(Some(Handle {
            input: vec![0.0; len as usize],
            core: None,
        }));
        r.len() as u32
    })
}
#[no_mangle]
pub extern "C" fn owned_input(id: u32) -> *mut f64 {
    with(id, |h| h.input.as_mut_ptr())
}
#[no_mangle]
pub extern "C" fn owned_init(id: u32) -> u32 {
    with(id, |h| {
        if h.core.is_some() {
            return 0;
        }
        match Owned::parse(&h.input) {
            Some(c) => {
                h.core = Some(c);
                h.input = Vec::new();
                1
            }
            None => 0,
        }
    })
}
#[no_mangle]
pub extern "C" fn owned_command_ptr(id: u32) -> *mut f64 {
    with(id, |h| {
        h.core
            .as_mut()
            .map_or(std::ptr::null_mut(), |c| c.commands.as_mut_ptr())
    })
}
#[no_mangle]
pub extern "C" fn owned_commands(id: u32, count: u32) -> u32 {
    with(id, |h| {
        h.core.as_mut().is_some_and(|c| c.commands(count as usize)) as u32
    })
}
#[no_mangle]
pub extern "C" fn owned_step(id: u32, dt: f64) -> u32 {
    with(id, |h| h.core.as_mut().is_some_and(|c| c.step(dt)) as u32)
}
#[no_mangle]
pub extern "C" fn owned_steps(id: u32) -> u32 {
    with(id, |h| h.core.as_ref().map_or(0, |c| c.steps))
}
#[no_mangle]
pub extern "C" fn owned_buffer(id: u32, kind: u32) -> *const u8 {
    with(id, |h| {
        h.core.as_ref().map_or(std::ptr::null(), |c| match kind {
            0 => c.pose.as_ptr().cast(),
            1 => c.world.as_ptr().cast(),
            2 => c.roots.as_ptr().cast(),
            3 => c.actions.as_ptr().cast(),
            4 => c.palette.as_ptr().cast(),
            _ => std::ptr::null(),
        })
    })
}
#[no_mangle]
pub extern "C" fn owned_free(id: u32) {
    OWNED.with(|r| {
        if let Some(h) = id
            .checked_sub(1)
            .and_then(|i| r.borrow_mut().get_mut(i as usize).map(Option::take))
        {
            drop(h);
        }
    });
}
#[cfg(test)]
mod tests {
    use super::*;
    fn input() -> Vec<f64> {
        let mut d = vec![2.0, 1.0, 1.0, 1.0, -1.0, 0.0];
        d.extend([
            0., 0., 0., 0., 0., 0., 1., 1., 1., 1., 0., 2., 0., 0., 0., 0., 1., 1., 1., 1.,
        ]);
        let identity = [
            1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.,
        ];
        d.extend(identity);
        let mut inv = identity;
        inv[13] = -2.;
        d.extend(inv);
        d.extend(identity);
        d.extend([1., 0., 0., 0., 2., 0., 1., 0., 0., 0., 4., 0., 0.]);
        d
    }
    #[test]
    fn persistent_clock_world_palette() {
        let mut c = Owned::parse(&input()).unwrap();
        c.commands[..8].copy_from_slice(&[0., 0., 0., 0., 1., 1., 0., 0.]);
        assert!(c.commands(1));
        assert!(c.step(0.25));
        assert_eq!(c.pose[0], 1.);
        assert_eq!(c.world[28], 1.);
        assert_eq!(c.palette[29], 0.);
        c.step(0.25);
        assert_eq!(c.pose[0], 2.);
        c.step(0.75);
        assert_eq!(c.pose[0], 1.);
    }
    #[test]
    fn invalid_commands_are_atomic() {
        let mut c = Owned::parse(&input()).unwrap();
        c.commands[..4].copy_from_slice(&[1., 0., 0., 0.5]);
        c.commands[20..24].copy_from_slice(&[6., 0., 1., 1.]);
        assert!(!c.commands(2));
        assert_eq!(c.actions[1], 0.);
        assert!(!c.step(f64::NAN));
        assert_eq!(c.steps, 0);
    }
    #[test]
    fn malformed_descriptor_and_stale_handle() {
        let mut d = input();
        d[5] = 1.;
        assert!(Owned::parse(&d).is_none());
        assert!(Owned::parse(&[f64::NAN; 4]).is_none());
        let id = owned_new(4);
        owned_free(id);
        assert_eq!(owned_step(id, 1.), 0);
        assert!(owned_buffer(id, 0).is_null());
        let next = owned_new(4);
        assert_ne!(id, next);
        owned_free(next);
    }
}
