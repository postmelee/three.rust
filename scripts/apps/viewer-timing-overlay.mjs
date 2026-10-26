import { createHash } from 'node:crypto';

export const VIEWER_TIMING_SOURCES = Object.freeze({
 'src/viewer.js': '506b3246b0f7e994e448e708abb64d01c4262964198c195de7cef73e173264cb',
 'node_modules/dat.gui/build/dat.gui.module.js': '5f5485de7cb927ca8561da20302aa4d19cd2ae60ace67d62a085424c3888ce92'
});
const once = (text, from, to) => {
 if (text.split(from).length !== 2) throw Error('Viewer timing source anchor is not unique');
 return text.replace(from, to);
};
// Apply to a generated application/dependency copy before bundling. Never alter
// the original checkout or node_modules. The native body remains byte-for-byte
// present; only its timing envelope and the GUI rAF timestamp are added.
export function instrumentViewerSource(file, bytes) {
 const expected = VIEWER_TIMING_SOURCES[file];
 if (!expected || createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('Viewer timing source hash mismatch: ' + file);
 let source = bytes.toString('utf8');
 if (file === 'src/viewer.js') {
  source = once(source, '\tanimate(time) {', '\tanimate(time) {\n\t\tconst __rthreeStart = performance.now();\n\t\ttry {');
  source = once(source, '\t\tthis.prevTime = time;\n\t}\n\n\trender() {', '\t\tthis.prevTime = time;\n\t\t} finally {\n\t\t\tconst __rthreeEnd = performance.now();\n\t\t\tglobalThis.__rthreeViewerTiming?.recordViewer(this, time, __rthreeStart, __rthreeEnd);\n\t\t}\n\t}\n\n\trender() {');
 } else {
  source = once(source, 'function updateDisplays(controllerArray) {', 'function updateDisplays(controllerArray, __rthreeRaf) {\n  const __rthreeStart = performance.now();\n  try {');
  source = once(source, 'requestAnimationFrame$1.call(window, function () {\n      updateDisplays(controllerArray);\n    });', 'requestAnimationFrame$1.call(window, function (__rthreeTime) {\n      updateDisplays(controllerArray, __rthreeTime);\n    });');
  source = once(source, '  Common.each(controllerArray, function (c) {\n    c.updateDisplay();\n  });\n}', '  Common.each(controllerArray, function (c) {\n    c.updateDisplay();\n  });\n  } finally {\n    const __rthreeEnd = performance.now();\n    globalThis.__rthreeViewerTiming?.recordGUI(controllerArray, __rthreeRaf, __rthreeStart, __rthreeEnd);\n  }\n}');
 }
 return source;
}
