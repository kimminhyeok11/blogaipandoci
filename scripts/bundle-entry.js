// Esbuild bundle entry: include core scripts in order
import '../js/config.js';
import '../js/dom-utils.js';
import '../js/ui-components.js';
import '../js/blog-app.js';
// defer modules also bundled to avoid extra network trips
import '../js/layout-manager.js';
import '../js/script-loader.js';
import '../js/perf-monitor.js';