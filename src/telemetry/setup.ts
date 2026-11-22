// Imported first by main.tsx: ES modules evaluate in import order, so the fetch
// instrumentation is installed before Firebase or the API client issue a request.
import { initTelemetry } from './index';

initTelemetry();
