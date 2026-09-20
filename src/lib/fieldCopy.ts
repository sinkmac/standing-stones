// Field-screen copy — every visitor-facing string on the field surfaces lives
// here, in one table, so a gate can scan it (scripts/verify-field.ts).
//
// STANDING RULE (register law, applied here): nothing may imply an observation
// was verified. Time and place are self-reported and taken as given. These
// strings therefore never contain "verified" / "confirmed" / "authenticated" /
// "correct", and never "proof".
//
// Register: calm short declaratives, one-handed, no exclamation.

export const STEP_LABELS: Record<string, string> = {
	prepare: 'Prepare',
	countdown: 'Countdown',
	field: 'In the field',
	record: 'Record',
	saved: 'Saved'
};

export const FIELD_COPY = {
	// Prepare
	prepareHeading: 'Before you go',
	prepareIntro:
		'This runs from what is stored on this device. It works with no signal once the app has been opened here.',
	prepareChecklist: [
		'Check the sky. If it is overcast, the visit is still worth recording.',
		'Know the access. Some sites close, some are by booking.',
		'Dress for standing still in the dark. Two layers more than feels right.',
		'Battery matters more than brightness. Field mode is easier on both.'
	],
	begin: 'Begin',
	fieldModeLabel: 'Field mode',
	fieldModeOn: 'Field mode on — red on black',
	fieldModeOff: 'Field mode off',
	fieldModeNote:
		'Field mode is a deliberate setting, not a theme. Turn it on for a dark field and keep your eyes adapted.',

	// Countdown
	countdownHeading: 'The appointment',
	countdownPending: 'Counting to the window.',
	countdownNoDate: 'This site has no datable window, so there is nothing to count down to. Go when the sky suits.',
	countdownTonight: 'The window is open now, or nearly so.',
	countdownApproaching: 'The window is close. Get in place.',
	countdownFar: 'There is time yet. Keep the plan, check the sky nearer the day.',
	countdownToField: 'I am here',

	// Field
	fieldHeading: 'In the field',
	fieldIntro:
		'Point the phone at the horizon. The band tells you roughly which way the ridge lies; the drag lets you line the profile up with the real thing.',
	orientationHeading: 'Direction',
	orientationTrue: 'True north',
	orientationMagnetic: 'Magnetic north (no local correction measured here)',
	orientationNoCorrection:
		'No declination is measured for this spot, so the direction is approximate. The band is wide on purpose.',
	orientationGrant: 'Wake the compass',
	orientationGrantNote: 'The compass needs a tap before it will give a reading.',
	orientationUnavailable:
		'No compass reading here. The drag-to-match below still works on its own.',
	orientationRight: 'Roughly the right way',
	orientationLeft: 'Turn left',
	orientationTurnRight: 'Turn right',
	orientationTarget: 'Target direction',
	matchHeading: 'Line the profile up with the ridge',
	matchIntro:
		'Drag the line until it sits on the ridge you can see. The match is yours to judge — nothing here scores it.',
	matchNudgeLeft: 'Shift left',
	matchNudgeRight: 'Shift right',
	matchDone: 'That is my match',
	matchUndo: 'Adjust again',
	matchBandLabel: 'Expected band',
	matchBandNote:
		'The band shows where the record puts the event against the line you matched. It is an alignment aid, not a picture of the sky.',
	matchNoBand: 'Match the line to the ridge to bring the expected band in.',

	// Record
	recordHeading: 'What happened',
	recordQuestion: 'Did you see it?',
	recordSawYes: 'I saw it',
	recordSawNo: 'I did not see it',
	recordReasonQuestion: 'Why not?',
	recordReasons: {
		cloud: 'Cloud',
		late: 'Arrived late',
		'wrong-spot': 'Wrong spot',
		choice: 'My own choice'
	} as Record<string, string>,
	recordNoteLabel: 'Anything to add (optional)',
	recordNotePlaceholder: 'One line is enough.',
	recordSave: 'Save this observation',
	recordSelfReport:
		'Time and place are recorded as your device reports them and kept as self-reported.',
	recordNoAnswer: 'Choose one answer before saving.',

	// Saved
	savedHeading: 'Saved on this device',
	savedBody:
		'Your observation is stored here, on this device, and nothing has been sent anywhere. Sending it to the register comes later.',
	savedCountOne: '1 observation stored on this device.',
	savedCountMany: (n: number) => `${n} observations stored on this device.`,
	savedAnother: 'Record another',
	savedRestart: 'Back to the start',
	savedIdLabel: 'Local reference'
} as const;
