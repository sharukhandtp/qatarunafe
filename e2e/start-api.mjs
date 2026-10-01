// Starts the QatarUna API for the end-to-end suite, on a database of its own that is rebuilt
// from the migrations and the demo seed on every run - so a test never depends on whatever
// state a developer's database happens to be in, and runs are repeatable.
//
// Playwright runs this as a webServer (see playwright.config.ts) and stops it afterwards.
// Settings, all optional:
//   QATARUNA_API_DIR         backend checkout (default: ../../BACKEND/VisualStudio/qataruna)
//   QATARUNA_E2E_SQLSERVER   SQL Server to use (default: LocalDB)

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { E2E } from './settings.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const apiDir = resolve(process.env.QATARUNA_API_DIR ?? join(here, '../../../BACKEND/VisualStudio/qataruna'))
const project = join(apiDir, 'src/QatarUna.Api')
const output = join(project, 'bin/e2e')

if (!existsSync(project)) {
  console.error(`QatarUna API not found at ${project}. Set QATARUNA_API_DIR to the backend checkout.`)
  process.exit(1)
}

const server = process.env.QATARUNA_E2E_SQLSERVER ?? '(localdb)\\mssqllocaldb'
const database = 'QatarUna_E2E'

// A separate output folder, so this build neither fights over locked files with an API that
// Visual Studio is running nor leaves the developer's own build in an unexpected state.
console.log(`[e2e] building ${project}`)
execFileSync('dotnet', ['build', project, '--nologo', '-v', 'q', '-o', output], { stdio: 'inherit' })

// Dropped first, so the API recreates it from the migrations - which also proves they apply.
try {
  execFileSync(
    'sqlcmd',
    ['-S', server, '-E', '-b', '-Q',
      `IF DB_ID('${database}') IS NOT NULL BEGIN ` +
      `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}] END`],
    { stdio: 'inherit' },
  )
} catch {
  console.error('[e2e] could not drop the previous E2E database (is sqlcmd installed?). Continuing on it.')
}

const scratch = join(tmpdir(), 'qataruna-e2e')
rmSync(scratch, { recursive: true, force: true })
mkdirSync(scratch, { recursive: true })

// Launched through the dotnet host rather than the generated .exe: on some Windows builds the
// apphost trips a CET shadow-stack assert, the dotnet host does not.
const api = spawn('dotnet', [join(output, 'QatarUna.Api.dll')], {
  cwd: output,
  stdio: 'inherit',
  env: {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'E2E',
    ASPNETCORE_URLS: E2E.apiUrl,
    ConnectionStrings__Default:
      `Server=${server};Database=${database};Trusted_Connection=True;TrustServerCertificate=True`,
    Database__Provider: 'SqlServer',
    Database__ApplyMigrationsOnStartup: 'true',
    Database__SeedDemoData: 'true',
    Seed__DefaultPassword: E2E.password,
    Jwt__SigningKey: 'e2e-signing-key-not-a-secret-0123456789abcdef',
    // The suite signs in as several roles a minute; the real limit is covered by the API's own tests.
    Security__RateLimit__AuthenticationPerMinute: '1000',
    Payments__Simulator__Enabled: 'true',
    Certificates__VerificationBaseUrl: `${E2E.webUrl}/verify`,
    Email__PickupDirectory: join(scratch, 'mail'),
    FileStorage__RootPath: join(scratch, 'attachments'),
    Observability__JsonConsole: 'false',
    Serilog__MinimumLevel__Default: 'Warning',
  },
})

const stop = () => api.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
api.on('exit', (code) => process.exit(code ?? 0))
