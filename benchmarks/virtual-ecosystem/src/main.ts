import { isLayoutBenchmarkFamily, parseBenchmarkFamily } from './families.js';

const family = parseBenchmarkFamily(new URLSearchParams(window.location.search).get('family'));

if (isLayoutBenchmarkFamily(family)) void import('./layout-runner.js');
else void import('./list-runner.js');
