import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import type { DeleteSessionConfirm } from '../types';

interface Props {
	info: DeleteSessionConfirm;
	onResult: (requestId: string, confirmed: boolean) => void;
}

/** One "what you would lose" section: capped list + exact count in the header. */
function WorkSection(props: { icon: string; label: string; count: number; items: string[]; mono?: boolean }) {
	if (props.count === 0) { return null; }
	return (
		<div class="delete-modal-section">
			<div class="delete-modal-section-title">
				<i class={`fas ${props.icon}`} aria-hidden="true" />
				<span>{props.label}</span>
				<span class="delete-modal-count">{props.count}</span>
			</div>
			<ul class={`delete-modal-list${props.mono ? ' mono' : ''}`}>
				{props.items.map((item, i) => <li key={i}>{item}</li>)}
				{props.count > props.items.length && (
					<li class="delete-modal-more">+{props.count - props.items.length} more…</li>
				)}
			</ul>
		</div>
	);
}

/**
 * Destructive-delete confirmation (GitHub "type the name" pattern). Shows the
 * project name prominently plus the exact inventory of work that would be lost
 * (commits absent from main, modified files, untracked files — or an "unknown
 * git state" notice when the host could not verify). The Delete button stays
 * disabled until the typed text equals the project name VERBATIM.
 */
export function DeleteSessionModal({ info, onResult }: Props) {
	const [typed, setTyped] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const matched = typed === info.project;
	const stateUnknown = info.checkFailed || !info.mainResolved;

	const cancel = useMemo(() => () => onResult(info.requestId, false), [info.requestId, onResult]);
	const confirm = useMemo(() => () => onResult(info.requestId, true), [info.requestId, onResult]);

	// Focus the name input as soon as the modal appears.
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// ESC cancels; Enter confirms only when the name matches.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				cancel();
			} else if (e.key === 'Enter' && matched) {
				e.preventDefault();
				confirm();
			}
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [cancel, confirm, matched]);

	return (
		<div class="delete-modal-overlay" onClick={cancel}>
			<div class="delete-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
				<div class="delete-modal-header">
					<i class="fas fa-triangle-exclamation" aria-hidden="true" />
					<div>
						<div class="delete-modal-kicker">Delete session permanently</div>
						<div class="delete-modal-project" title={info.project}>{info.project}</div>
						<div class="delete-modal-sub">
							Session {info.number}
							{info.branch && <span class="delete-modal-branch">{info.branch}</span>}
							{' · '}worktree and branch will be removed
						</div>
					</div>
				</div>

				{stateUnknown ? (
					<div class="delete-modal-unknown">
						<i class="fas fa-circle-question" aria-hidden="true" />
						<span>
							{info.checkFailed
								? 'Git state could not be checked — this session may contain work that exists nowhere else.'
								: "The main branch could not be resolved — commits that are absent from it cannot be verified."}
						</span>
					</div>
				) : (
					<WorkSection icon="fa-code-commit" label="Commits not in main" count={info.commitsCount} items={info.commits} />
				)}
				<WorkSection icon="fa-file-pen" label="Uncommitted changes" count={info.modifiedCount} items={info.modified} mono />
				<WorkSection icon="fa-file-circle-plus" label="Untracked files" count={info.untrackedCount} items={info.untracked} mono />

				<div class="delete-modal-verify">
					<div class="delete-modal-verify-label">
						Type <span class="delete-modal-verify-name">{info.project}</span> to confirm
					</div>
					<input
						ref={inputRef}
						class={`delete-modal-input${typed ? (matched ? ' ok' : ' bad') : ''}`}
						type="text"
						value={typed}
						placeholder={info.project}
						spellcheck={false}
						autoCapitalize="off"
						autoCorrect="off"
						onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
					/>
				</div>

				<div class="delete-modal-actions">
					<button class="delete-modal-btn cancel" onClick={cancel}>Cancel</button>
					<button class="delete-modal-btn delete" disabled={!matched} onClick={confirm}>
						<i class="fas fa-trash" aria-hidden="true" />
						Delete forever
					</button>
				</div>
			</div>
		</div>
	);
}
