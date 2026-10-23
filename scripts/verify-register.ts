// Register gate: the count only ever includes the two at-the-stones states,
// remote observers are reported but never counted, entries with no reported
// state are never counted, and no register wording implies verification.
import { readFileSync } from 'node:fs';
import {
	VIGIL_STATES, tallyRegister, vigilCountLine, vigilZeroState, vigilRemoteLine, isVigilState
} from '../src/lib/registerCopy.ts';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
	if (!ok) failures++;
}

console.log('--- REGISTER ---');

const t = tallyRegister([
	{ vigilState: 'AT_THE_STONES', sawEvent: true, weather: 'clear' },
	{ vigilState: 'ATTENDED_LATER', sawEvent: false, weather: 'overcast' },
	{ vigilState: 'REMOTE', sawEvent: true, weather: 'clear' },
	{ sawEvent: true, weather: 'rain' }
]);
check('kept counts only the two at-the-stones states', t.kept === 2, `kept=${t.kept}`);
check('saw and cloud are drawn only from kept entries', t.saw === 1 && t.cloud === 1, `saw=${t.saw} cloud=${t.cloud}`);
check('remote is reported, not counted', t.remote === 1, `remote=${t.remote}`);
check('no state -> not counted', tallyRegister([{ sawEvent: true, weather: 'clear' }]).kept === 0, 'kept=0');
check('state check rejects unknown values', !isVigilState('VERIFIED') && !isVigilState('toString') && isVigilState('REMOTE'), 'ok');
check('remote line empty at zero', vigilRemoteLine(0) === '', JSON.stringify(vigilRemoteLine(0)));
check('count line, solar site', vigilCountLine(1, 1, 0, 'sun').includes('1 person') && vigilCountLine(1, 1, 0, 'sun').includes('saw the sun'), vigilCountLine(1, 1, 0, 'sun'));

const FORBIDDEN = /\b(verified|verify|confirmed|confirm|authenticated|correct|proof|validated)\b/i;
const words = [
	...Object.values(VIGIL_STATES), vigilCountLine(3, 1, 2), vigilZeroState(), vigilRemoteLine(2),
	readFileSync('src/routes/register/+page.svelte', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
].join('\n');
const m = words.match(FORBIDDEN);
check('no register wording implies verification', !m, m ? `found '${m[0]}'` : 'none');

if (failures) { console.log(`\n${failures} REGISTER CHECK(S) FAILED`); process.exit(1); }
console.log('\nALL REGISTER CHECKS PASSED');
