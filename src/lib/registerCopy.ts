// Register copy — settled here so the live zero-state is never an afterthought.
//
// Register: calm, plain, short declaratives; invitation, not an empty-state
// callout (matches the front door and the existing register intro, "Non-events
// are valid entries. Cloudy counts.").
//
// STANDING RULE: nothing here may imply an observation was verified. Time and
// location are self-reported and accepted on trust — that is the design, not a
// gap to close. Use "reported", never "verified" / "confirmed" / "authenticated".
//
// NOT YET RENDERED: the register display is built in a later phase; this module
// only settles the words now.

/** The three submission states. Only AT_THE_STONES and ATTENDED_LATER count
 *  toward "kept the vigil"; REMOTE is reported, never counted. */
export const VIGIL_STATES = {
	AT_THE_STONES: 'recorded at the stones during the window',
	ATTENDED_LATER: 'added later by someone who attended',
	REMOTE: 'observed remotely'
} as const;

export type VigilState = keyof typeof VIGIL_STATES;

/** True only for the two states that count as having kept the vigil. */
export function countsAsKept(state: VigilState): boolean {
	return state === 'AT_THE_STONES' || state === 'ATTENDED_LATER';
}

/**
 * The agreed count line.
 *
 * `kept` counts ONLY the two at-the-stones states. Cloud and no-shows are
 * entries, not failures, so they are reported inside `kept`; remote observers
 * are passed separately (see vigilRemoteLine) and never inflate the count.
 */
export function vigilCountLine(kept: number, saw: number, cloud: number): string {
	return `${kept} ${kept === 1 ? 'person' : 'people'} reported keeping this vigil. ` +
		`${saw} saw the moon. ${cloud} reported cloud.`;
}

/** Zero-state: invitation, not an apology. The register will read zero for a long time. */
export function vigilZeroState(): string {
	return 'Nobody has reported keeping this vigil yet. The register takes what happened, including nothing.';
}

/** Remote observers: reported for completeness, never counted toward the vigil. */
export function vigilRemoteLine(remote: number): string {
	if (remote <= 0) return '';
	return `${remote} more reported observing from elsewhere.`;
}
