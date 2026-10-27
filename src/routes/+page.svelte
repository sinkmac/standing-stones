<script lang="ts">
	import { onMount } from 'svelte';
	import { calculateNextLunarLunistice } from '$lib/lunarLunistice';
	import {
		fieldGuideSites,
		getFieldGuideSiteByProtoId,
		PHOTO_CREDITS,
		COUNTRIES,
	} from '$lib/fieldGuideData';

	type FGSite = (typeof fieldGuideSites)[number];

	interface CountdownInfo {
		slug: string;
		days: number | null;
		label: string;
		date: string;
	}

	interface CanonEntry {
		latitude: number;
		longitude: number;
		approach: string;
		description: string;
	}

	let { data }: { data: { sites: FGSite[]; countdowns: CountdownInfo[]; canon: Record<string, CanonEntry> } } = $props();

	// --- derived state ---
	let canonBySlug = data.canon;

	let countdownBySlug = $derived(
		data.countdowns.reduce<Record<string, { slug: string; days: number | null; label: string; date: string }>>((acc, c) => {
			acc[c.slug] = c;
			return acc;
		}, {})
	);

	let fgBySlug = $derived(
		fieldGuideSites.reduce<Record<string, FGSite>>((acc, s) => {
			acc[s.slug] = s;
			return acc;
		}, {})
	);

	// --- UI state ---
	let filter: string = 'all';
	let query: string = '';
	let view: 'cards' | 'map' = 'cards';
	let saved: string[] = [];
	let notes: Array<{
		id: string;
		site: string;
		date: string;
		weather: string;
		result: string;
		text: string;
		photo: string | null;
	}> = [];
	let activeId: string | null = null;
	let mapReady = false;
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	// --- persistence ---
	const STORAGE_PREFIX = 'standing-stones:';

	function read<T>(key: string, fallback: T): T {
		try {
			const raw = localStorage.getItem(STORAGE_PREFIX + key);
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	function persist<T>(key: string, value: T): boolean {
		try {
			localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
			return true;
		} catch {
			toast('Storage is full or unavailable. Export your notes before continuing.');
			return false;
		}
	}

	function toast(msg: string) {
		const el = document.getElementById('toast');
		if (el) {
			el.textContent = msg;
			el.classList.add('show');
			if (toastTimer) clearTimeout(toastTimer);
			toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
		}
	}

	// --- init ---
	onMount(() => {
		saved = read('saved', []);
		notes = read('notes', []);
		renderNotes();
	});

	// --- helpers ---
	const ESC_MAP: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	};
	function esc(s: string) {
		return String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c] ?? c);
	}

	function uid() {
		return typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
	}

	function matchingSites(): FGSite[] {
		return fieldGuideSites.filter((s) => {
			if (filter === 'saved') return saved.includes(s.slug);
			if (filter !== 'all') return s.country === filter;
			const q = query.toLowerCase();
			return [s.name, s.region, s.country, s.kind].join(' ').toLowerCase().includes(q);
		});
	}

	function render() {
		const rows = matchingSites();
		const countEl = document.getElementById('result-count');
		if (countEl) countEl.textContent = `${rows.length} ${rows.length === 1 ? 'place' : 'places'}`;
		const grid = document.getElementById('site-grid');
		if (grid) {
			grid.innerHTML = rows.length
				? rows
						.map((s) => siteCardHTML(s))
						.join('')
				: '<p class="empty">No places found. Try a different search, or save a place using its heart button.</p>';
		}
		const gridEl = document.getElementById('site-grid');
		const mapPanel = document.getElementById('map-panel');
		if (gridEl) gridEl.hidden = view !== 'cards';
		if (mapPanel) mapPanel.hidden = view !== 'map';
		renderMapPins(rows);
		if (view === 'map') {
			const first = rows[0];
			if (first) showMapDetail(first);
			else {
				const detail = document.getElementById('map-detail');
				if (detail) detail.innerHTML = '<p>No matching places. Change your filter or search.</p>';
			}
		}
	}

	function siteCardHTML(s: FGSite): string {
		const hasImg = !!s.image;
		const img = hasImg
			? `<img class="site-img" src="/images/standing-stones/${esc(s.image)}" alt="${esc(s.name)}" loading="lazy">`
			: planDrawing(s);
		const savedNow = saved.includes(s.slug);
		return `
			<article class="site-card">
				<button class="save ${savedNow ? 'saved' : ''}" data-save="${esc(s.slug)}" aria-label="${savedNow ? 'Unsave' : 'Save'} ${esc(s.name)}" aria-pressed="${savedNow}">${savedNow ? '♥' : '♡'}</button>
				<button class="card-image" data-open="${esc(s.slug)}" aria-label="Explore ${esc(s.name)}">${img}<span class="tag">${esc(s.kind)}</span></button>
				<p class="card-meta">${esc(s.region.toUpperCase())} · ${esc(s.country.toUpperCase())}</p>
				<button class="card-title" data-open="${esc(s.slug)}"><h3>${esc(s.name)}</h3><span>↗</span></button>
				<p class="card-caption">${esc(s.caption)}</p>
			</article>
		`;
	}

	function planDrawing(s: FGSite) {
		const isRow = s.slug === 'ballochroy';
		const shapes = isRow
			? '<rect x="110" y="65" width="18" height="32" rx="4"/><rect x="140" y="102" width="18" height="32" rx="4"/><rect x="170" y="139" width="18" height="32" rx="4"/>'
			: '<circle cx="150" cy="115" r="66" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="115" r="45" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5"/><path d="M140 170 V115 H160 V170 M125 110 H175 V90 H125Z" fill="none" stroke="currentColor" stroke-width="2"/>';
		return `
			<div class="illustration">
				<svg viewBox="0 0 300 230" aria-label="Illustrative monument plan">
					<g fill="currentColor">${shapes}</g>
					<path d="M150 15 V45 M135 30 H165" stroke="currentColor" opacity=".5"/>
					<text x="150" y="215" text-anchor="middle" font-size="8" letter-spacing="2" fill="currentColor">ILLUSTRATIVE PLAN · NOT TO SCALE</text>
				</svg>
			</div>
		`;
	}

	function toggleSave(id: string) {
		const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
		if (persist('saved', next)) {
			saved = next;
			render();
			const detailSave = document.getElementById('detail-save') as HTMLButtonElement | null;
			const dlg = document.getElementById('site-dialog') as HTMLDialogElement | null;
			if (detailSave && dlg && dlg.open) {
				detailSave.textContent = saved.includes(id) ? '♥ Saved' : '♡ Save place';
				detailSave.setAttribute('aria-pressed', saved.includes(id).toString());
			}
			toast(saved.includes(id) ? 'Place saved to this browser' : 'Place removed from your saved list');
		}
	}

	// --- countdown: computed server-side, from data.countdowns ---

	// --- site dialog ---
	function openSite(slug: string) {
		const canon = canonBySlug[slug];
		const fg = fgBySlug[slug];
		if (!canon || !fg) return;
		activeId = slug;
		const content = document.getElementById('site-content');
		if (!content) return;
		const savedNow = saved.includes(slug);
		const cd = countdownBySlug[slug];
		const daysStr = cd?.days !== null ? `${cd.days} days` : '—';
		content.innerHTML = siteDialogHTML(fg, canon, savedNow, daysStr);
		const ds = document.getElementById('detail-save') as HTMLButtonElement | null;
		if (ds) {
			ds.onclick = () => toggleSave(slug);
		}
		const dn = document.getElementById('detail-note') as HTMLButtonElement | null;
		if (dn) {
			dn.onclick = () => {
				const dlg = document.getElementById('site-dialog') as HTMLDialogElement | null;
				if (dlg) dlg.close();
				openNote(slug);
			};
		}
		const cal = document.getElementById('calendar') as HTMLButtonElement | null;
		if (cal) {
			cal.onclick = () => {
				const raw = (document.getElementById('visit-date') as HTMLInputElement).value;
				if (!raw) { toast('Choose a visit date first'); return; }
				downloadCalendar(fg, raw);
			};
		}
		const dlg = document.getElementById('site-dialog') as HTMLDialogElement | null;
		if (dlg) dlg.showModal();
	}

	function siteDialogHTML(fg: FGSite, canon: CanonEntry, savedNow: boolean, daysStr: string): string {
		const hasImg = !!fg.image;
		return `
			${hasImg ? `<img class="detail-image" src="/images/standing-stones/${esc(fg.image)}" alt="${esc(fg.name)}">` : planDrawing(fg)}
			<div class="detail-body">
				<p class="detail-region">${esc(fg.region.toUpperCase())} · ${esc(fg.country.toUpperCase())}</p>
				<h2>${esc(fg.name)}</h2>
				<p>${esc(canon.description)}</p>
				<div class="evidence">${esc(fg.evidence)}<br><span class="fine">${esc(fg.season)}</span></div>
				<div class="detail-actions">
					<button id="detail-save" class="button" data-save="${esc(fg.slug)}" aria-pressed="${savedNow}">${savedNow ? '♥ Saved' : '♡ Save place'}</button>
					<a class="button" href="https://www.google.com/maps/dir/?api=1&destination=${canon.latitude},${canon.longitude}" target="_blank" rel="noopener">Directions ↗</a>
					<button class="button" id="detail-note">＋ Record a visit</button>
				</div>
				<div class="detail-grid">
					<div>
						<h3>Before you go</h3>
						<p>${esc(canon.approach)}</p>
						<h3>Where to look</h3>
						<p>${esc(fg.look)}</p>
						<a href="${esc(fg.source)}" target="_blank" rel="noopener">Official information · ${esc(fg.sourceName)} ↗</a>
						<p class="fine" style="margin-top:15px">${canon.latitude.toFixed(4)}° N · ${Math.abs(canon.longitude).toFixed(4)}° W<br>Overview location, not an access route or exact viewing position.</p>
					</div>
					<div class="visit-plan">
						<h3 style="margin-top:0">Plan your vigil</h3>
						<label for="visit-date">Choose your visit date</label>
						<input type="date" id="visit-date" value="${localToday()}">
						<div class="checklist">
							<label><input type="checkbox"> Check access and booking</label>
							<label><input type="checkbox"> Check local weather near the day</label>
							<label><input type="checkbox"> Bring warm layers and a torch</label>
							<label><input type="checkbox"> Allow time to arrive in daylight</label>
						</div>
						<button class="button gold" id="calendar">Add to calendar ↓</button>
						<p class="fine" style="margin-top:15px">An all-day planning reminder, not a confirmed event time or admission booking. Choose the date that fits your visit.</p>
					</div>
				</div>
			</div>
		`;
	}

	function localToday() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// --- calendar download (ICS) ---
	function downloadCalendar(fg: FGSite, raw: string) {
		const d = new Date(raw + 'T12:00:00Z');
		d.setUTCDate(d.getUTCDate() + 1);
		const start = raw.replaceAll('-', '');
		const end = d.toISOString().slice(0, 10).replaceAll('-', '');
		const clean = (x: string) => x.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n');
		const icsLines = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Standing Stones//Field Guide//EN',
			'CALSCALE:GREGORIAN',
			'BEGIN:VEVENT',
			`UID:${uid()}@standingstones`,
			`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
			`DTSTART;VALUE=DATE:${start}`,
			`DTEND;VALUE=DATE:${end}`,
			`SUMMARY:${clean('Plan a vigil: ' + fg.name)}`,
			`LOCATION:${clean(fg.name + ', ' + fg.region)}`,
			`DESCRIPTION:${clean('Personal planning reminder. Confirm access and weather. This is not an exact alignment prediction or admission booking. ' + fg.source)}`,
			'END:VEVENT',
			'END:VCALENDAR',
		];
		const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${fg.slug}-vigil.ics`;
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		toast('Calendar reminder downloaded');
	}

	// --- map ---
	const project = ([lon, lat]: [number, number]): [number, number] => [70 + (lon + 11) * 38, 560 - (lat - 50) * 52];

	function renderMapPins(rows: FGSite[]) {
		const old = document.getElementById('map-pins');
		if (old) old.remove();
		if (!mapReady) return;
		const ns = 'http://www.w3.org/2000/svg';
		const g = document.createElementNS(ns, 'g');
		g.id = 'map-pins';
		for (const s of rows) {
			const [x, y] = project([s.longitude, s.latitude]);
			const p = document.createElementNS(ns, 'g');
			p.classList.add('map-pin');
			p.setAttribute('role', 'button');
			p.setAttribute('tabindex', '0');
			p.setAttribute('aria-label', 'Explore ' + esc(s.name));
			p.setAttribute('transform', `translate(${x},${y})`);
			p.innerHTML = `<circle r="9"/><text x="14" y="4">${esc(s.name)}</text>`;
			p.onclick = () => showMapDetail(s);
			p.onkeydown = (e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					showMapDetail(s);
				}
			};
			g.append(p);
		}
		const map = document.getElementById('map');
		if (map) map.append(g);
	}

	function showMapDetail(s: FGSite) {
		activeId = s.slug;
		const detail = document.getElementById('map-detail');
		if (!detail) return;
		const hasImg = !!s.image;
		detail.innerHTML = `
			${hasImg ? `<img class="detail-image" src="/images/standing-stones/${esc(s.image)}" alt="${esc(s.name)}">` : planDrawing(s)}
			<p class="eyebrow">${esc(s.region.toUpperCase())} · ${esc(s.country.toUpperCase())}</p>
			<h3>${esc(s.name)}</h3>
			<p>${esc(s.caption)}</p>
			<p class="fine">${esc(s.season)}</p>
			<button class="button gold" data-open="${esc(s.slug)}">Explore this place ↗</button>
		`;
	}

	function loadMap() {
		const fetchPromises = COUNTRIES.map((c) =>
			fetch(`/images/standing-stones/${c.toLowerCase()}.json`).then((r) => r.json())
		);
		Promise.all(fetchPromises)
			.then((data: any) => {
				const ns = 'http://www.w3.org/2000/svg';
				const map = document.getElementById('map');
				if (!map) return;
				for (const d of data) {
					for (const f of d.features) {
						const geom: any = f.geometry;
						const isMulti = geom.type === 'MultiPolygon';
						const polys: any[] = isMulti ? geom.coordinates : [geom.coordinates];
						for (const poly of polys) {
							const path = document.createElementNS(ns, 'path');
							const dAttr = poly
								.map((ring: any) => {
									const pts = ring as number[][];
									return 'M' + pts.map((c: any) => project([c[0], c[1]]).join(',')).join('L') + 'Z';
								})
								.join('');
							path.setAttribute('d', dAttr);
							path.classList.add('map-land');
							map.append(path);
						}
					}
				}
				const islands = document.createElementNS(ns, 'path');
				islands.setAttribute('d', 'M220 126L233 110L237 137L223 160L216 148Z M345 91L361 85L366 98L352 103Z');
				islands.classList.add('map-land');
				map.append(islands);
				mapReady = true;
				renderMapPins(matchingSites());
			})
			.catch(() => {
				const map = document.getElementById('map');
				if (map) map.outerHTML = '<p class="empty">The map could not load. All places are available in the gallery.</p>';
			});
	}

	// --- alignment viewer (generic illustration) ---
	let animValue = 35;
	let frame: ReturnType<typeof requestAnimationFrame> | null = null;

	function scene(value: number) {
		const v = Number(value);
		const x = 120 + v * 4.6;
		const y = 147 + v * 2.65;
		const sun = document.getElementById('sun');
		const beam = document.getElementById('sun-beam');
		const phase = document.getElementById('phase');
		const timeOutput = document.getElementById('time-output');
		const timeSlider = document.getElementById('time-slider') as HTMLInputElement | null;
		if (sun) sun.setAttribute('transform', `translate(${x} ${y})`);
		const strength = Math.max(0, 1 - Math.abs(v - 50) / 12);
		if (beam) beam.setAttribute('opacity', String(strength));
		if (phase) phase.textContent = v < 45 ? 'APPROACHING THE AXIS' : v <= 55 ? 'LIGHT MEETS STONE' : 'THE MOMENT PASSES';
		if (timeOutput) timeOutput.textContent = v < 45 ? 'Approaching' : v <= 55 ? 'Aligned' : 'Passing';
		if (timeSlider) timeSlider.value = String(v);
		animValue = v;
	}

	function stopAnim() {
		if (frame) cancelAnimationFrame(frame);
		frame = null;
		const play = document.getElementById('play');
		if (play) {
			play.textContent = '▶';
			play.setAttribute('aria-label', 'Play alignment animation');
		}
	}

	function initAlignmentViewer() {
		const slider = document.getElementById('time-slider') as HTMLInputElement | null;
		if (slider) {
			slider.oninput = (e) => {
				stopAnim();
				scene(Number((e.target as HTMLInputElement).value));
			};
		}
		const play = document.getElementById('play');
		if (play) {
			play.onclick = () => {
				if (frame) {
					stopAnim();
					return;
				}
				if (animValue >= 99) animValue = 0;
				play.textContent = 'Ⅱ';
				play.setAttribute('aria-label', 'Pause alignment animation');
				let last = performance.now();
				function tick(now: number) {
					animValue += (now - last) / 160;
					last = now;
					scene(Math.min(animValue, 100));
					if (animValue >= 100) {
						stopAnim();
						return;
					}
					frame = requestAnimationFrame(tick);
				}
				frame = requestAnimationFrame(tick);
			};
		}
		[...document.querySelectorAll('[data-demo]')].forEach((b) => {
			b.addEventListener('click', () => {
				const passage = b.getAttribute('data-demo') === 'passage';
				[...document.querySelectorAll('[data-demo]')].forEach((x) =>
					x.classList.toggle('active', x === b)
				);
				const circleStones = document.getElementById('circle-stones');
				const passageStones = document.getElementById('passage-stones');
				if (circleStones) circleStones.toggleAttribute('hidden', passage);
				if (passageStones) passageStones.toggleAttribute('hidden', !passage);
				const title = document.getElementById('demo-title');
				const desc = document.getElementById('demo-description');
				if (title) title.textContent = passage ? 'A beam into the darkness' : 'A window onto the winter sun';
				if (desc)
					desc.textContent = passage
						? 'A narrow opening admits the low sunlight. When direction and height coincide, the light can reach along a passage into the chamber beyond.'
						: 'Follow the setting sun towards the gap between the stones. As it reaches the axis, a fleeting line connects the sky, the monument and you.';
				stopAnim();
				scene(35);
			});
		});
		scene(35);
	}

	// --- field notes (private, localStorage) ---
	function openNote(id = 'stonehenge') {
		const form = document.getElementById('note-form') as HTMLFormElement | null;
		const siteSelect = document.getElementById('note-site') as HTMLSelectElement | null;
		const dateInput = document.getElementById('note-date') as HTMLInputElement | null;
		const status = document.getElementById('note-status');
		form?.reset();
		if (siteSelect) siteSelect.value = id;
		if (dateInput) {
			dateInput.value = localToday();
			dateInput.max = localToday();
		}
		if (status) status.textContent = 'Private to this browser. No account needed.';
		const dlg = document.getElementById('note-dialog') as HTMLDialogElement | null;
		if (dlg) dlg.showModal();
	}

	function renderNotes() {
		const countEl = document.getElementById('journal-count');
		const notesEl = document.getElementById('notes');
		if (countEl) countEl.textContent = String(notes.length);
		if (notesEl) {
			notesEl.innerHTML = notes.length
				? notes
						.map(
							(n) => `
				<article class="note">
					<small>${esc(n.date)} · ${esc(n.weather)}</small>
					<h3>${esc(getFieldGuideSiteByProtoId(n.site)?.name || n.site)}</h3>
					<small>${esc(n.result)}</small>
					${n.photo ? `<img src="${esc(n.photo)}" alt="Photograph from your visit">` : ''}
					<p>${esc(n.text)}</p>
					<button data-delete="${esc(n.id)}">Delete note</button>
				</article>
			`
						)
						.join('')
				: '<div class="notebook-empty"><span>✧</span><h3>Your first page is waiting.</h3><p>A place, a date, a few words.<br>You don’t need a perfect sunset to begin.</p></div>';
		}
		[...document.querySelectorAll('[data-delete]')].forEach((b) => {
			b.addEventListener('click', (e) => {
				const btn = b as HTMLButtonElement;
				if (!btn.classList.contains('confirm-delete')) {
					btn.classList.add('confirm-delete');
					btn.textContent = 'Delete this note? Click to confirm';
					return;
				}
				const next = notes.filter((n) => n.id !== btn.dataset.delete);
				if (persist('notes', next)) {
					notes = next;
					renderNotes();
				}
			});
		});
	}

	async function photoData(file: File | null): Promise<string | null> {
		if (!file) return null;
		if (file.size > 8 * 1024 * 1024) throw Error('Choose an image smaller than 8 MB.');
		const bitmap = await createImageBitmap(file);
		const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
		const c = document.createElement('canvas');
		c.width = bitmap.width * ratio;
		c.height = bitmap.height * ratio;
		c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height);
		bitmap.close();
		return c.toDataURL('image/jpeg', 0.7);
	}

	function initNoteForm() {
		const siteSelect = document.getElementById('note-site') as HTMLSelectElement | null;
		if (siteSelect) {
			siteSelect.innerHTML = fieldGuideSites.map((s) => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('');
		}
		const form = document.getElementById('note-form') as HTMLFormElement | null;
		if (form) {
			form.onsubmit = async (e) => {
				e.preventDefault();
				const button = e.submitter as HTMLButtonElement | null;
				if (button) button.disabled = true;
				try {
					const textInput = document.getElementById('note-text') as HTMLTextAreaElement | null;
					const text = textInput?.value.trim() ?? '';
					if (!text) throw Error('Write a few words about your visit.');
					const photoInput = document.getElementById('note-photo') as HTMLInputElement | null;
					const photo = await photoData(photoInput?.files?.[0] ?? null);
					const siteSelect = document.getElementById('note-site') as HTMLSelectElement;
					const dateInput = document.getElementById('note-date') as HTMLInputElement;
					const weatherSelect = document.getElementById('note-weather') as HTMLSelectElement;
					const resultSelect = document.getElementById('note-result') as HTMLSelectElement;
					const next = [
						{
							id: uid(),
							site: siteSelect.value,
							date: dateInput.value,
							weather: weatherSelect.value,
							result: resultSelect.value,
							text,
							photo,
						},
						...notes,
					];
					if (persist('notes', next)) {
						notes = next;
						renderNotes();
						const dlg = document.getElementById('note-dialog') as HTMLDialogElement | null;
						if (dlg) dlg.close();
						toast('Your moment is kept in this browser');
					}
				} catch (err: any) {
					const status = document.getElementById('note-status');
					if (status) status.textContent = err.message || 'That image could not be read. Try a JPG or PNG.';
				} finally {
					if (button) button.disabled = false;
				}
			};
		}
		const exportBtn = document.getElementById('export-notes') as HTMLButtonElement | null;
		if (exportBtn) {
			exportBtn.onclick = () => {
				const payload = {
					exported: new Date().toISOString(),
					notes,
					savedPlaces: saved,
				};
				const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'standing-stones-field-notes.json';
				document.body.append(a);
				a.click();
				a.remove();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
				toast('Notebook exported');
			};
		}
		const addBtn = document.getElementById('add-note') as HTMLButtonElement | null;
		if (addBtn) {
			addBtn.onclick = () => openNote();
		}
	}

	// --- dialog handlers ---
	function initDialogs() {
		[...document.querySelectorAll('dialog .close')].forEach((b) => {
			b.addEventListener('click', () => {
				const d = b.closest('dialog') as HTMLDialogElement | null;
				if (d) d.close();
			});
		});
		[...document.querySelectorAll('dialog')].forEach((d) => {
			d.addEventListener('click', (e) => {
				const r = d.getBoundingClientRect();
				if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
					(d as HTMLDialogElement).close();
				}
			});
		});
		const aboutBtn = document.getElementById('about-button') as HTMLButtonElement | null;
		if (aboutBtn) {
			aboutBtn.onclick = () => {
				const dlg = document.getElementById('about-dialog') as HTMLDialogElement | null;
				if (dlg) dlg.showModal();
				const sourceList = document.getElementById('source-list');
				if (sourceList) {
					sourceList.innerHTML = fieldGuideSites
						.map((s) => `<li><a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(s.name)} — ${esc(s.sourceName)}</a></li>`)
						.join('');
				}
			};
		}
	}

	// --- global click delegation ---
	function initGlobalHandlers() {
		document.addEventListener('click', (e) => {
			const target = e.target as Element;
			const o = target.closest('[data-open]');
			const s = target.closest('[data-save]');
			if (o) openSite(o.getAttribute('data-open')!);
			if (s) toggleSave(s.getAttribute('data-save')!);
		});
	}

	// --- initialize on mount ---
	onMount(() => {
		initDialogs();
		initGlobalHandlers();
		initNoteForm();
		initAlignmentViewer();
		loadMap();
		render();
	});
</script>

<svelte:head>
	<title>Standing Stones — Meet the ancient sky</title>
	<meta name="description" content="Ancient places. Extraordinary light. Explore standing stones, understand their alignments and plan your own vigil." />
	<link rel="preload" as="image" href="/images/standing-stones/stonehenge.jpg" />
</svelte:head>

<a class="skip" href="#explore">Skip to explorer</a>

<header>
	<a class="brand" href="#">
		<span class="brand-icon">◒</span>
		<span>STANDING<br>STONES<span class="brand-sub">A FIELD GUIDE TO THE ANCIENT SKY</span></span>
	</a>
	<nav aria-label="Main navigation">
		<a href="#explore">Explore the stones</a>
		<a href="#alignment">Follow the light</a>
		<a href="#journal">My field notes <span id="journal-count">0</span></a>
	</nav>
	<a class="nav-plan" href="#explore">Find your next vigil <span>↗</span></a>
</header>

<main>
	<section class="hero" aria-labelledby="hero-title">
		<div class="hero-shade"></div>
		<div class="hero-content">
			<p class="eyebrow"><span class="line"></span> OLD STONES. THE SAME SKY.</p>
			<h1 id="hero-title">Some moments<br>are thousands<br>of years <em>in the making.</em></h1>
			<p class="hero-copy">Find the places where stone and sky meet.<br>Understand the light. Go and see for yourself.</p>
			<div class="hero-actions">
				<a class="button gold" href="#explore">Explore the stones <span>↗</span></a>
				<a class="text-link" href="#alignment">See how an alignment works <span>→</span></a>
			</div>
		</div>
		<div class="hero-bottom">
			<span>01 / BALLOCHROY <small>KINTYRE, SCOTLAND · 55.71° N</small></span>
			<span class="hero-scroll">SCROLL TO DISCOVER ↓</span>
			<a href="#season" class="next-event">
				<span class="sun-icon">☼</span>
				<span>NEXT SEASONAL MILESTONE<strong>Next alignment <b id="countdown"></b></strong></span>
				<span>↗</span>
			</a>
		</div>
	</section>

	<div class="intro-strip">
		<p>Not just a place to visit.<br><em>A moment to be there.</em></p>
		<span>Seven ancient places across Britain and Ireland.<br>Solar alignments, lunar questions and a reason to look up.</span>
		<span class="small-seal">STONE<br>✳<br>SKY</span>
	</div>

	<section id="explore" class="section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">01 / FIND YOUR PLACE</p>
				<h2>A landscape full<br>of <em>appointments.</em></h2>
			</div>
			<p>Follow the sun west. Find a quiet circle.<br>Choose a place that makes you want to go.</p>
		</div>
		<div class="explore-toolbar">
			<div class="filters" role="group" aria-label="Filter sites">
				<button data-filter="all" class="active">All places <span>7</span></button>
				<button data-filter="Scotland">Scotland</button>
				<button data-filter="Ireland">Ireland</button>
				<button data-filter="England">England</button>
				<button data-filter="saved">♡ Saved</button>
			</div>
			<div class="view-controls" role="group" aria-label="Display">
				<button id="cards-view" class="active">▦ Gallery</button>
				<button id="map-view">⌖ Map</button>
			</div>
		</div>
		<div class="search-row">
			<label for="search">Find a place</label>
			<input id="search" type="search" placeholder="Search name, region or alignment…" />
			<span id="result-count" aria-live="polite"></span>
		</div>
		<div id="site-grid" class="site-grid"></div>
		<div id="map-panel" hidden>
			<div class="map-canvas">
				<svg id="map" viewBox="0 0 650 600" role="img" aria-label="Map of seven ancient sites in Britain and Ireland"></svg>
				<span class="map-note">Select a gold marker to explore · overview map</span>
			</div>
			<div id="map-detail"></div>
		</div>
	</section>

	<section id="alignment" class="alignment-section">
		<div class="alignment-copy">
			<p class="eyebrow">02 / FOLLOW THE LIGHT</p>
			<h2>The sky moves.<br>The stones <em>remember.</em></h2>
			<p>At the solstice, the sun reaches an extreme in its yearly journey along the horizon. Some ancient monuments were built to frame that returning light.</p>
			<div class="tabs" role="group" aria-label="Alignment demonstration">
				<button class="active" data-demo="circle">Stone circle</button>
				<button data-demo="passage">Passage tomb</button>
			</div>
			<h3 id="demo-title">A window onto the winter sun</h3>
			<p id="demo-description">Follow the setting sun towards the gap between the stones. As it reaches the axis, a fleeting line connects the sky, the monument and you.</p>
			<p class="fine">An illustrative model, not a survey of a particular monument or a prediction of where to stand.</p>
		</div>
		<div class="simulator">
			<div class="sim-label">
				<span>THE ALIGNMENT VIEWER</span>
				<span id="phase">APPROACHING THE AXIS</span>
			</div>
			<svg id="sky-scene" viewBox="0 0 700 430" role="img" aria-label="Interactive illustration of sunlight aligning with ancient stones">
				<defs>
					<linearGradient id="sky" x2="0" y2="1">
						<stop stop-color="#142d38" />
						<stop offset=".65" stop-color="#536572" />
						<stop offset="1" stop-color="#d5a66a" />
					</linearGradient>
					<radialGradient id="glow">
						<stop stop-color="#ffda9b" stop-opacity=".85" />
						<stop offset="1" stop-color="#e5ab66" stop-opacity="0" />
					</radialGradient>
					<linearGradient id="beamGrad" x2="0" y2="1">
						<stop stop-color="#ffd6a0" stop-opacity=".6" />
						<stop offset="1" stop-color="#ffd6a0" stop-opacity="0" />
					</linearGradient>
				</defs>
				<rect width="700" height="430" fill="url(#sky)" />
				<g opacity=".45" fill="#fff">
					<circle cx="80" cy="52" r="1" />
					<circle cx="190" cy="95" r="1" />
					<circle cx="590" cy="62" r="1.5" />
					<circle cx="430" cy="33" r="1" />
				</g>
				<path d="M0 283 Q90 240 180 273 T350 268 T530 277 T700 255 V430 H0Z" fill="#344846" />
				<path d="M0 307 Q160 280 310 302 T700 295 V430 H0Z" fill="#192c2b" />
				<path id="horizon-line" d="M120 147 L580 412" fill="none" stroke="#ffffff1a" stroke-width="1" />
				<g id="circle-stones">
					<circle cx="150" cy="115" r="66" fill="none" stroke="#ffffff33" stroke-width="2" />
					<circle cx="150" cy="115" r="45" fill="none" stroke="#ffffff22" stroke-width="1" stroke-dasharray="2 5" />
					<path d="M140 170 V115 H160 V170 M125 110 H175 V90 H125Z" fill="none" stroke="#ffffff33" stroke-width="2" />
				</g>
				<g id="passage-stones">
					<path d="M120 140 V300 H160 V140 Z" fill="none" stroke="#ffffff33" stroke-width="2" />
					<path d="M140 160 H180 V140 H140 Z" fill="none" stroke="#ffffff33" stroke-width="1" />
					<rect x="145" y="300" width="30" height="40" fill="none" stroke="#ffffff33" stroke-width="2" />
				</g>
				<g id="sun" transform="translate(281, 240)">
					<circle cx="0" cy="0" r="14" fill="#ffd6a0" />
					<circle cx="0" cy="0" r="6" fill="#fff" />
				</g>
				<path id="sun-beam" d="M281 240 L420 340" fill="url(#beamGrad)" opacity="0.4" />
				<g id="beam-end" opacity="0.6">
					<path d="M400 320 Q420 340 440 320" fill="none" stroke="#ffd6a0" stroke-width="2" stroke-linecap="round" />
				</g>
			</svg>
			<div class="sim-controls">
				<input type="range" id="time-slider" min="0" max="100" value="35" />
				<div class="time-label"><span id="time-output">Approaching</span></div>
				<button id="play">▶</button>
			</div>
		</div>
	</section>

	<section id="season" class="section season">
		<div>
			<p class="eyebrow">03 / THE TURNING YEAR</p>
			<h2>Make time<br>for <em>midwinter.</em></h2>
			<p>The shortest days can hold the longest memories.<br>Start with a place, then make a plan.</p>
			<p class="fine">A solstice is an astronomical moment. A visible alignment can span several days or weeks, and depends on the horizon and weather.</p>
		</div>
		<div class="season-list">
			<button data-open="maeshowe">
				<span class="event-month">NOV<br><b>— JAN</b></span>
				<span><small>ORKNEY · WINTER SUNSET</small><strong>Light in the heart of Maeshowe</strong><em>A broad winter window · guided access</em></span>
				<span>↗</span>
			</button>
			<button data-open="newgrange">
				<span class="event-month">DEC<br><b>19–23</b></span>
				<span><small>COUNTY MEATH · WINTER SUNRISE</small><strong>The first light at Newgrange</strong><em>Chamber access by solstice lottery</em></span>
				<span>↗</span>
			</button>
			<button data-open="stonehenge">
				<span class="event-month">DEC<br><b>~21</b></span>
				<span><small>WILTSHIRE · WINTER SUNSET</small><strong>The return of the sun</strong><em>Check official seasonal access arrangements</em></span>
				<span>↗</span>
			</button>
		</div>
	</section>

	<section id="journal" class="journal-section">
		<div>
			<p class="eyebrow">04 / KEEP THE MOMENT</p>
			<h2>Every vigil<br><em>leaves a story.</em></h2>
			<p>The cloud never broke. The wind took your hat.<br>Then, for a moment, the light came through.</p>
			<p>Or it didn’t. That belongs here too.</p>
			<button class="button gold" id="add-note">＋ Write a field note</button>
			<p class="fine">Your notes and saved places stay in this browser.<br>Export a copy to keep them safe.</p>
		</div>
		<div class="notebook">
			<div class="notebook-top">
				<span>MY FIELD NOTES</span>
				<button id="export-notes">Export ↓</button>
			</div>
			<div id="notes"></div>
			<div class="notebook-foot">A record of being there. Whatever the sky did.</div>
		</div>
	</section>
</main>

<footer>
	<a class="brand" href="#">
		<span class="brand-icon">◒</span>
		<span>STANDING<br>STONES</span>
	</a>
	<p>Ancient places. Extraordinary light.<br>A field guide for the curious.</p>
	<div>
		<button id="about-button">About this guide & sources ↗</button>
		<p>Leave the stones as you found them.</p>
	</div>
</footer>

<dialog id="site-dialog">
	<button class="close" aria-label="Close site details">×</button>
	<div id="site-content"></div>
</dialog>

<dialog id="note-dialog">
	<button class="close" aria-label="Close field note">×</button>
	<p class="eyebrow">YOUR FIELD NOTEBOOK</p>
	<h2>A moment <em>worth keeping.</em></h2>
	<form id="note-form">
		<label>Place<select id="note-site" required></select></label>
		<div class="form-row">
			<label>Date<input type="date" id="note-date" required /></label>
			<label>Sky<select id="note-weather"><option>Clear</option><option>Partly cloudy</option><option>Overcast</option><option>Rain</option><option>Snow</option></select></label>
		</div>
		<label>Did you see the alignment?
			<select id="note-result">
				<option>I came to explore</option>
				<option>Yes, I saw it</option>
				<option>No — the sky had other plans</option>
				<option>Not sure</option>
			</select>
		</label>
		<label>What will you remember?
			<textarea id="note-text" rows="4" required maxlength="3000" placeholder="The light, the wind, the walk, the silence…"></textarea>
		</label>
		<label>Add a photograph (optional, max 8 MB)<input type="file" id="note-photo" accept="image/*" /></label>
		<button class="button gold" type="submit">Keep this moment →</button>
		<p class="fine" id="note-status" role="status">Private to this browser. No account needed.</p>
	</form>
</dialog>

<dialog id="about-dialog">
	<button class="close" aria-label="Close about">×</button>
	<p class="eyebrow">ABOUT THIS FIELD GUIDE</p>
	<h2>Wonder, with<br><em>room for questions.</em></h2>
	<p>This first edition brings together seven places from the original Standing Stones vigil project. It distinguishes documented solar alignments from proposed or debated interpretations. The interactive viewer is a general illustration, not a site survey.</p>
	<h3>Sources & visiting information</h3>
	<ul id="source-list"></ul>
	<p>Check the site manager’s current information before travelling. Calendar downloads are all-day planning reminders, not admission tickets or exact viewing predictions. There is no live weather feed in this edition.</p>
	<h3>Photography & map</h3>
	<p>
		Stonehenge: Zaxx / <a href="https://unsplash.com/photos/stonehenge-england-during-day-q-7BxOvJJ14" target="_blank" rel="noopener">Unsplash</a>.
		Calanais: <a href="https://commons.wikimedia.org/wiki/File:Calanais_Standing_Stones_20090610_01.jpg" target="_blank" rel="noopener">Wikimedia Commons (Otter)</a>.
		Maeshowe exterior: <a href="https://commons.wikimedia.org/wiki/File:Orkn_Maeshowe_view.JPG" target="_blank" rel="noopener">Wikimedia Commons (User:Museum, public domain)</a>.
		Drombeg: <a href="https://commons.wikimedia.org/wiki/File:Drombeg-stone-circle-west-cork.JPG" target="_blank" rel="noopener">Wikimedia Commons</a>.
		Newgrange: <a href="https://unsplash.com/photos/ancient-mound-structure-with-green-grass-and-blue-sky-2MH8XpW4OCk" target="_blank" rel="noopener">Adrien Olichon / Unsplash</a>.
		Clava Cairns: <a href="https://commons.wikimedia.org/wiki/File:Ring_Cairn.jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.
		Ballochroy: <a href="https://commons.wikimedia.org/wiki/File:Ballochroy%2CStanding_Stones_Group.jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.
		Overview boundaries: Natural Earth, public domain.
	</p>
	<h3>Your notebook</h3>
	<p>Notes, photographs and saved places are stored locally on this device. Clearing browser data removes them. Use Export for a portable JSON backup. This edition has no public visitor register.</p>
	<h3>Public register</h3>
	<p>The public vigil register (separate from this notebook) lives at <a href="/register">/register</a>. Submissions there go to the public record via Netlify Blobs — they are not private notes.</p>
</dialog>

<div id="toast" role="status"></div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Display&display=swap');

	:root {
		--bg: #111d1e;
		--panel: #172628;
		--ink: #f0ede3;
		--muted: #a9b4ad;
		--gold: #e3bf82;
		--line: #ffffff20;
		--serif: 'Libre Caslon Display', Georgia, serif;
		--sans: 'DM Sans', Arial, sans-serif;
	}
	* { box-sizing: border-box }
	html { scroll-behavior: smooth; scroll-padding-top: 95px }
	body {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font: 15px/1.65 var(--sans);
	}
	button, input, select, textarea { font: inherit }
	button, a, input, select, textarea { -webkit-tap-highlight-color: transparent }
	button, a { touch-action: manipulation }
	button { cursor: pointer }
	a { color: inherit; text-decoration: none }
	button { color: inherit; background: none; border: 0 }
	button:hover, a:hover { color: var(--gold) }
	:focus-visible { outline: 2px solid var(--gold); outline-offset: 5px }
	h1, h2, h3, p { margin-top: 0 }
	h1, h2, h3 { font-weight: 0 }
	h2 { font: clamp(40px, 4.8vw, 68px) / 1.05 var(--serif); letter-spacing: -1px; margin-bottom: 24px }
	h3 { font: 29px / 1.15 var(--serif) }
	em { font-weight: 400 }
	p { color: var(--muted) }
	[hidden] { display: none !important }

	.skip {
		position: fixed;
		top: -100px;
		background: var(--gold);
		color: #111;
		padding: 12px;
		z-index: 99;
	}
	.skip:focus { top: 0 }

	header {
		height: 105px;
		padding: 0 5%;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #fff3;
		background: linear-gradient(#10181980, transparent);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		line-height: 1.05;
		letter-spacing: 2px;
		font-size: 17px;
		font-weight: 500;
	}
	.brand-icon {
		font-size: 55px;
		line-height: 1;
		color: var(--gold);
		font-weight: 400;
	}
	.brand-sub {
		display: block;
		font-size: 7px;
		letter-spacing: 1.5px;
		margin-top: 9px;
	}
	nav { display: flex; gap: 34px; font-size: 12px }
	nav span { border: 1px solid #fff4; border-radius: 50%; padding: 2px 6px; font-size: 10px }
	.nav-plan { font-size: 12px; border-bottom: 1px solid #fff6; padding: 9px 0 }
	.nav-plan span { margin-left: 20px }

	.hero {
		min-height: 760px;
		height: 95svh;
		max-height: 1100px;
		position: relative;
		background: #35433d url('/images/standing-stones/ballochroy.jpg') center 52%/cover;
		isolation: isolate;
	}
	.hero-shade {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(90deg, #081316e8 0%, #101b1c93 37%, #0b171b16 75%), linear-gradient(0deg, #111d1e 0%, transparent 45%, #111d1e20 70%);
	}
	.hero-content { padding: 190px 6% 150px }
	.eyebrow { font-size: 10px; letter-spacing: 2px; color: var(--gold); font-weight: 500; margin-bottom: 26px }
	.line { display: inline-block; width: 30px; height: 1px; background: var(--gold); vertical-align: middle; margin-right: 12px }
	h1 { font: clamp(52px, 5.7vw, 84px) / 1.04 var(--serif); letter-spacing: -1.5px; max-width: 780px; margin-bottom: 27px; text-shadow: 0 1px 30px #0003 }
	h1 em { color: #ead7b4 }
	.hero-copy { font-size: 14px; color: #e0e4dd; line-height: 1.8 }
	.hero-actions { display: flex; align-items: center; gap: 30px; margin-top: 32px }
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 35px;
		padding: 15px 23px;
		font-size: 12px;
		font-weight: 600;
		border: 1px solid var(--line);
	}
	.gold { color: #172022; background: var(--gold); border-color: var(--gold) }
	.gold:hover { background: #f0d3a3; color: #111 }
	.text-link { font-size: 12px; border-bottom: 1px solid #fff5; padding: 10px 0 }
	.text-link span { margin-left: 14px }
	.hero-bottom {
		position: absolute;
		bottom: 0;
		left: 6%;
		right: 6%;
		padding: 27px 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid #ffffff38;
		font-size: 10px;
		letter-spacing: 1.4px;
	}
	.hero-bottom small { display: block; font-size: 8px; color: #bbc3bb; letter-spacing: 1px; margin-top: 6px }
	.hero-scroll { font-size: 9px; color: #b9c2bc }
	.next-event { display: flex; align-items: center; gap: 20px; font-size: 8px; letter-spacing: 1px }
	.next-event strong { display: block; font-weight: 400; font-size: 14px; letter-spacing: 0; margin-top: 3px }
	.next-event b { color: var(--gold); font-size: 11px; margin-left: 15px; font-weight: 400 }
	.sun-icon { font-size: 38px; color: var(--gold) }

	.intro-strip {
		margin: 0 6%;
		padding: 45px 0;
		border-bottom: 1px solid var(--line);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 50px;
	}
	.intro-strip p { font: 29px / 1.25 var(--serif); color: var(--ink); margin: 0 }
	.intro-strip > span { font-size: 12px; color: var(--muted) }
	.intro-strip .small-seal {
		width: 76px;
		height: 76px;
		border: 1px solid #d0b47b66;
		border-radius: 50%;
		text-align: center;
		font-size: 9px;
		line-height: 1.8;
		padding: 10px;
		color: var(--gold);
		letter-spacing: 2px;
	}

	.section { padding: 95px 6% }
	.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 34px }
	.section-heading h2 { margin-bottom: 0 }
	.section-heading > p { font-size: 13px; max-width: 320px; margin-bottom: 6px }

	.explore-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--line);
		gap: 15px;
	}
	.filters, .view-controls { display: flex; gap: 8px }
	.filters button, .view-controls button {
		font-size: 11px;
		padding: 15px 14px;
		color: var(--muted);
		border-bottom: 2px solid transparent;
	}
	.filters button:first-child { padding-left: 0 }
	.filters button.active { color: var(--gold); border-bottom-color: var(--gold) }
	.filters span { font-size: 9px; margin-left: 4px }
	.view-controls { gap: 0; border: 1px solid var(--line); padding: 3px }
	.view-controls button { padding: 6px 12px; border: 0 }
	.view-controls button.active { background: #ffffff12; color: var(--ink) }

	.search-row { display: flex; align-items: center; gap: 15px; margin: 30px 0 0 0 }
	.search-row label { font-size: 12px; color: var(--muted) }
	.search-row input[type=search] {
		width: 280px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid #ffffff25;
		padding: 8px;
		color: var(--ink);
	}
	.search-row input[type=search]::placeholder { color: #ffffff33 }
	.search-row #result-count { font-size: 11px; color: var(--muted); white-space: nowrap }
	@media (max-width: 700px) {
		.search-row input[type=search] { width: 70% }
	}

	.site-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 22px; margin-top: 20px }
	.site-card { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden }
	.save {
		position: absolute;
		top: 12px;
		right: 12px;
		font-size: 18px;
		padding: 6px;
		border-radius: 50%;
		background: #ffffff0d;
		color: var(--muted);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.save.saved { color: var(--gold) }
	.save[aria-pressed="true"] { color: var(--gold) }
	.card-image {
		position: relative;
		width: 100%;
		height: 180px;
		overflow: hidden;
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0b171b;
	}
	.card-image img { width: 100%; height: 100%; object-fit: cover; display: block }
	.card-image .illustration { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted) }
	.tag {
		position: absolute;
		top: 10px;
		left: 10px;
		font-size: 9px;
		letter-spacing: 1px;
		background: #111d1ecc;
		color: var(--gold);
		padding: 4px 8px;
		border-radius: 3px;
		border: 1px solid #ffffff20;
	}
	.card-meta { font-size: 10px; letter-spacing: 1.4px; color: var(--muted); margin: 10px 12px 0 12px }
	.card-title {
		width: 100%;
		padding: 12px;
		text-align: left;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.card-title h3 { font: 20px / 1.2 var(--serif); letter-spacing: -0.5px; margin: 0 }
	.card-title span { font-size: 10px }
	.card-caption { font-size: 12px; color: var(--muted); margin: 0 12px 12px 12px; line-height: 1.5 }
	.empty { grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 0 }

	#map-panel { display: flex; flex-direction: column; gap: 12px }
	.map-canvas { position: relative; flex: 1; min-height: 420px; background: #0b171b; border: 1px solid var(--line); border-radius: 8px; overflow: hidden }
	#map { width: 100%; height: 100%; display: block }
	.map-land { fill: none; stroke: #ffffff1a; stroke-width: 1 }
	.map-pin { cursor: pointer }
	.map-pin circle { fill: var(--gold); stroke: #111d1e; stroke-width: 2 }
	.map-pin text { fill: #111d1e; font-size: 9px; font-weight: 700; letter-spacing: 0.4px; paint-order: stroke; stroke: #ffffff; stroke-width: 3px }
	.map-note { font-size: 10px; color: var(--muted); padding: 0 12px }
	#map-detail {
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 16px;
	}
	#map-detail .detail-image {
		width: 100%;
		height: 140px;
		object-fit: cover;
		border-radius: 6px;
		background: #0b171b;
	}
	#map-detail .eyebrow { font-size: 10px; letter-spacing: 1.4px; color: var(--gold); font-weight: 500; margin: 0 }
	#map-detail h3 { font: 20px / 1.2 var(--serif); margin: 4px 0 6px 0 }
	#map-detail p { font-size: 13px; margin: 0 }
	#map-detail p.fine { font-size: 11px }

	.alignment-section { background: #0b171b; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line) }
	.alignment-copy { max-width: 520px }
	.simulator { position: relative; margin-top: 40px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #071012 }
	.sim-label { display: flex; justify-content: space-between; padding: 16px 20px; background: #071012; border-bottom: 1px solid var(--line); font-size: 11px; letter-spacing: 1.5px; color: var(--muted) }
	.sim-label span:first-child { letter-spacing: 2px; color: var(--gold) }
	#sky-scene { width: 100%; height: 300px; display: block; background: #071012 }
	.sim-controls { padding: 16px 20px; display: flex; align-items: center; gap: 16px; background: #071012 }
	.sim-controls input[type=range] { flex: 1; accent-color: var(--gold) }
	.time-label { font-size: 10px; color: var(--muted); min-width: 70px; text-align: center }
	#play { font-size: 16px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 6px; color: var(--ink) }
	.tabs { display: flex; gap: 10px; margin-bottom: 16px }
	.tabs button { font-size: 12px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 6px; color: var(--muted) }
	.tabs button.active { border-color: var(--gold); color: var(--ink) }

	.season { background: #0b171b }
	.season-list { display: flex; gap: 16px; margin-top: 30px }
	.season-list button {
		flex: 1;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 20px;
		text-align: left;
		cursor: pointer;
	}
	.season-list button:hover { border-color: var(--gold) }
	.event-month { font: 14px / 1 var(--serif); letter-spacing: 1px; color: var(--gold) }
	.event-month b { display: block; font-size: 16px; margin-top: 2px }
	.season-list small { font-size: 10px; letter-spacing: 1.4px; color: var(--muted); text-transform: uppercase }
	.season-list strong { display: block; font: 16px / 1.2 var(--serif); margin-top: 6px; color: var(--ink) }
	.season-list em { font-size: 12px; color: var(--muted) }

	.journal-section { background: #0b171b; border-top: 1px solid var(--line) }
	.notebook {
		margin-top: 30px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}
	.notebook-top { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--line) }
	.notebook-top span { font: 14px / 1 var(--serif); letter-spacing: 1px; color: var(--gold) }
	.notebook-foot { padding: 16px; font-size: 11px; color: var(--muted); text-align: center; border-top: 1px solid var(--line) }
	#notes { padding: 16px; min-height: 200px }
	.note { padding: 14px 0; border-bottom: 1px solid var(--line) }
	.note:last-child { border-bottom: none }
	.note small { font-size: 11px; color: var(--muted) }
	.note h3 { font: 16px / 1.2 var(--serif); margin: 4px 0 2px 0; color: var(--ink) }
	.note img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; background: #071012 }
	.note p { font-size: 13px; color: var(--ink); margin: 6px 0 0 0 }
	.note button { font-size: 11px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 4px; color: var(--muted); margin-top: 8px }
	.note button.confirm-delete { border-color: #8a3a3a; color: #8a3a3a }
	.notebook-empty { text-align: center; padding: 40px 20px; color: var(--muted) }
	.notebook-empty h3 { color: var(--ink); margin: 8px 0 6px 0 }

	footer { margin-top: 60px; padding: 40px 6%; border-top: 1px solid var(--line) }
	footer .brand { font-size: 15px }
	footer p { font-size: 13px; margin: 8px 0 }
	footer div { margin-top: 20px }
	footer button { font-size: 12px; padding: 10px 16px; border: 1px solid var(--line); border-radius: 6px; color: var(--ink) }

	/* Site dialog */
	#site-content { display: flex; gap: 18px; }
	.detail-image { width: 260px; height: 200px; object-fit: cover; border-radius: 8px; background: #071012; flex-shrink: 0 }
	.detail-body { flex: 1 }
	.detail-region { font-size: 10px; letter-spacing: 1.4px; color: var(--gold); font-weight: 500; text-transform: uppercase }
	.detail-body h2 { font: 26px / 1.15 var(--serif); margin: 6px 0 10px 0 }
	.detail-body p { font-size: 13px; line-height: 1.6 }
	.evidence { font-size: 12px; color: var(--muted); margin: 12px 0; padding: 10px; background: #071012; border-radius: 6px; border-left: 3px solid var(--gold) }
	.evidence .fine { font-size: 11px; display: block; margin-top: 6px }
	.detail-actions { display: flex; gap: 10px; margin: 16px 0; flex-wrap: wrap }
	.detail-actions .button { padding: 10px 16px; font-size: 12px }
	.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px }
	.detail-grid h3 { font: 16px / 1.2 var(--serif); margin-bottom: 8px; color: var(--ink) }
	.detail-grid p { font-size: 13px; line-height: 1.6; margin: 0 0 10px 0 }
	.visit-plan { display: flex; flex-direction: column; gap: 10px }
	.visit-plan label { font-size: 12px; color: var(--muted) }
	.visit-plan input[type=date] { width: 100%; padding: 8px; background: #071012; border: 1px solid var(--line); border-radius: 4px; color: var(--ink) }
	.checklist { font-size: 12px; color: var(--muted) }
	.checklist label { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 }
	.checklist input[type=checkbox] { margin-top: 2px }

	/* Note dialog */
	.form-row { display: flex; gap: 12px }
	.form-row label { flex: 1 }
	#note-form label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px }
	#note-form select, #note-form input, #note-form textarea {
		width: 100%;
		padding: 8px;
		background: #071012;
		border: 1px solid var(--line);
		border-radius: 4px;
		color: var(--ink);
		margin-top: 4px;
	}
	#note-form textarea { resize: vertical; min-height: 100px }
	#note-form button { padding: 12px 24px; font-size: 12px; font-weight: 600; margin-top: 16px }
	#note-status { font-size: 11px; margin-top: 10px }

	/* About dialog */
	#about-dialog h3 { font: 16px / 1.2 var(--serif); margin: 16px 0 8px 0; color: var(--gold) }
	#about-dialog ul { list-style: disc inside; padding: 0; font-size: 13px; color: var(--ink) }
	#about-dialog li { margin: 4px 0 }

	/* Toast */
	#toast {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: #172628;
		color: var(--ink);
		padding: 10px 18px;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 12px;
		opacity: 0;
		transition: opacity 0.3s;
		z-index: 100;
	}
	#toast.show { opacity: 1 }

	/* Responsive */
	@media (max-width: 700px) {
		header { padding: 0 4%; height: 80px }
		.brand { font-size: 14px; gap: 8px }
		.brand-icon { font-size: 40px }
		nav { gap: 18px; font-size: 11px }
		.nav-plan { font-size: 11px; padding: 6px 0 }
		.nav-plan span { margin-left: 12px }
		.hero { min-height: 600px }
		.hero-content { padding: 140px 4% 100px }
		.hero-actions { flex-direction: column; gap: 12px; align-items: flex-start }
		.button { gap: 20px; padding: 12px 18px; font-size: 11px }
		.hero-bottom { left: 4%; right: 4%; flex-direction: column; gap: 12px; align-items: flex-start; font-size: 9px }
		.hero-bottom small { margin-top: 0 }
		.next-event { gap: 10px }
		.next-event strong { font-size: 12px }
		.next-event b { font-size: 10px; margin-left: 8px }
		.sun-icon { font-size: 30px }
		.intro-strip { flex-direction: column; gap: 20px; text-align: center; padding: 30px 4% }
		.section { padding: 60px 4% }
		.site-grid { grid-template-columns: 1fr; gap: 16px }
		.card-image { height: 150px }
		.explore-toolbar { flex-direction: column; gap: 12px; align-items: stretch }
		.filters { flex-wrap: wrap }
		.search-row { flex-direction: column; gap: 10px; align-items: stretch }
		.search-row input[type=search] { width: 100% }
		#site-content { flex-direction: column; gap: 14px }
		.detail-image { width: 100%; height: 200px; flex-shrink: 0 }
		.detail-grid { grid-template-columns: 1fr }
		.sim-controls { flex-direction: column; gap: 12px; align-items: stretch }
		.time-label { min-width: auto }
		.season-list { flex-direction: column }
		.form-row { flex-direction: column }
		footer { padding: 40px 4% }
	}
</style>