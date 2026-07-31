/**
 * Script to generate TypeScript types from OpenAPI specification
 * Reads the API URL from .env file (VITE_API_BASE_URL)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('Warning: .env file not found, using default API URL');
    return {};
  }
}

// Get API base URL from .env or use default
const env = loadEnv();
const apiBaseUrl = env.VITE_API_BASE_URL || 'https://dev-api.perfect-toss.com';
const swaggerUrl = `${apiBaseUrl}/swagger/internal/swagger.json`;
const outputPath = 'src/api/schema.d.ts';

console.log(`📡 Fetching OpenAPI spec from: ${swaggerUrl}`);
console.log(`📝 Generating types to: ${outputPath}`);

try {
  // Run openapi-typescript command
  execSync(
    `npx openapi-typescript "${swaggerUrl}" -o "${outputPath}"`,
    { stdio: 'inherit' }
  );
  
  console.log('✅ API types generated successfully!');
} catch (error) {
  console.error('❌ Failed to generate API types:', error);
  process.exit(1);
}
