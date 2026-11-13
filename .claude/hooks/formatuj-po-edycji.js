// Hook PostToolUse (Edit|Write): formatuje zmieniony plik Prettierem, a pliki .ts sprawdza ESLintem.
// Błędy ESLint wracają do Claude (exit 2 + stderr), żeby od razu je poprawił.
const { spawnSync } = require('child_process');
const path = require('path');

const KATALOG_PROJEKTU = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const ROZSZERZENIA_PRETTIER = new Set(['.ts', '.js', '.mjs', '.json', '.md', '.yml', '.yaml']);

function uruchom(skrypt, argumenty) {
  return spawnSync(process.execPath, [path.join(KATALOG_PROJEKTU, skrypt), ...argumenty], {
    cwd: KATALOG_PROJEKTU,
    encoding: 'utf8',
  });
}

let wejscie = '';
process.stdin.on('data', (fragment) => (wejscie += fragment));
process.stdin.on('end', () => {
  let plik;
  try {
    plik = JSON.parse(wejscie).tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!plik) process.exit(0);

  const sciezka = path.resolve(KATALOG_PROJEKTU, plik);
  const wzgledna = path.relative(KATALOG_PROJEKTU, sciezka);
  if (wzgledna.startsWith('..') || wzgledna.includes('node_modules') || path.basename(sciezka).startsWith('.env')) {
    process.exit(0);
  }

  const rozszerzenie = path.extname(sciezka);
  if (ROZSZERZENIA_PRETTIER.has(rozszerzenie)) {
    uruchom('node_modules/prettier/bin/prettier.cjs', ['--write', '--log-level', 'warn', sciezka]);
  }

  if (rozszerzenie === '.ts') {
    const wynik = uruchom('node_modules/eslint/bin/eslint.js', ['--max-warnings', '0', sciezka]);
    if (wynik.status !== 0) {
      process.stderr.write(`ESLint – popraw błędy w ${wzgledna}:\n${wynik.stdout}${wynik.stderr}`);
      process.exit(2);
    }
  }
  process.exit(0);
});
