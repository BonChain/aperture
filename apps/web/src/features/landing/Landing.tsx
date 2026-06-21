// apps/web/src/features/landing/Landing.tsx
//
// Front-door landing page (the pitch). Header/footer are shared chrome (rendered
// by Root); this file is the page body. Tonal hierarchy only — no gradients/glow.
// Copy is business-level and honesty-clean (no banned lexicon, no over-claiming).

import type { ReactNode } from 'react';

import { ButtonPrimary } from '../../shared/components/ButtonPrimary';
import {
	IconShield,
	IconUsers,
	IconEye,
	IconBuilding,
	IconFileCheck,
	IconArrowRight,
	IconBadgeCheck,
	IconLock,
	type IconComponent,
} from '../../shared/components/icons';
import { color, glass, glassStrong, radius, space } from '../../theme/tokens';
import { FlowDiagram } from './FlowDiagram';

export interface LandingProps {
	onEnter: () => void;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface Stat {
	value: string;
	label: string;
}
const STATS: readonly Stat[] = [
	{ value: 'Zero-threshold', label: 'EU Travel Rule: identity data on every transfer, in force since Dec 2024.' },
	{ value: 'July 2027', label: 'EU AMLR pulls all CASPs into scope; unidentified institutional accounts barred.' },
	{ value: 'Still exploring', label: 'The analytics incumbents Mysten invited — TRM, Merkle — have not shipped a confidential-transfer compliance product.' },
	{ value: '128 bytes', label: 'Proof size. Generated in under a second, verified in your browser.' },
];

interface Card {
	tag: string;
	title: string;
	body: string;
	Icon: IconComponent;
}
const CARDS: readonly Card[] = [
	{
		tag: 'Problem',
		title: 'Confidential transfers blind compliance',
		body:
			"Sui's confidential transfers encrypt amounts — powerful for privacy, but they break every compliance tool that assumed amounts were readable.",
		Icon: IconShield,
	},
	{
		tag: "Who it's for",
		title: 'Issuers, auditors, and holders',
		body:
			'Issuers who must stay compliant, auditors who need bounded and logged reads, and holders who want to prove a figure without exposing everything.',
		Icon: IconUsers,
	},
	{
		tag: 'How it works',
		title: 'Prove a total, keep the rest private',
		body:
			'Prove a sum about your encrypted activity to whoever you choose — without revealing which entries were included, and without handing over your key.',
		Icon: IconEye,
	},
];

const WHY_SUI: readonly Card[] = [
	{
		tag: 'Unblocks adoption',
		title: 'Regulated money can move on Sui',
		body:
			'Issuers cannot use confidential transfers without a compliance layer. Aperture is that layer — so stablecoin and institutional flows can move on Sui, privately and legally.',
		Icon: IconBuilding,
	},
	{
		tag: 'Sets the standard',
		title: 'An open disclosure format',
		body:
			'The proof format and verifier are open and inspectable — a shared standard for confidential assets on Sui, not a walled app. More issuers → auditors learn the format → it sets the norm.',
		Icon: IconBadgeCheck,
	},
	{
		tag: 'No new trust',
		title: "Built on Sui's own primitive",
		body:
			"Aperture rides Mysten's confidential transfers directly — adding the disclosure layer on top, with no new cryptographic trust assumptions.",
		Icon: IconLock,
	},
];

interface UseCase {
	title: string;
	body: string;
	Icon: IconComponent;
}
const USE_CASES: readonly UseCase[] = [
	{
		title: 'Prove income to a lender',
		body: 'Clear a loan threshold without exposing your full balance or every payment.',
		Icon: IconBuilding,
	},
	{
		title: 'Prove reserves to an auditor',
		body: 'Designated, bounded, logged reads — selective disclosure, not a master key.',
		Icon: IconFileCheck,
	},
	{
		title: 'Prove a payout to a regulator',
		body: 'Disclosure on order, with a tamper-evident trail of who saw what.',
		Icon: IconEye,
	},
];

interface ModelItem {
	tag: string;
	body: string;
}
const MODEL: readonly ModelItem[] = [
	{ tag: 'Open-core', body: 'The SDK and on-chain verifier stay open — that earns trust and makes it a standard. The hosted enterprise layer is what we charge for.' },
	{ tag: 'Issuers pay', body: 'Token & stablecoin issuers subscribe to the hosted Auditor Console + audit-trail + compliance reports — they pay to discharge a legal obligation.' },
	{ tag: 'Usage-based', body: 'Per-disclosure / per-proof pricing scales income with regulatory activity, alongside reporting and integration add-ons.' },
];

interface RoadmapItem {
	phase: string;
	when: string;
	body: string;
}
const ROADMAP: readonly RoadmapItem[] = [
	{
		phase: 'Now',
		when: 'Devnet PoC',
		body:
			'Mode B (Proof-of-Figure) runs end to end — generate a 128-byte proof and verify it in the browser, with on-chain verification on live devnet. Mode A (Auditor Console) is designed.',
	},
	{
		phase: 'Next',
		when: 'Testnet',
		body:
			'Harden the proof layer, land the first design-partner issuer, and ship the Travel-Rule disclosure flow.',
	},
	{
		phase: 'Then',
		when: 'Mainnet',
		body:
			'Open-core launch — become the default audit & disclosure layer that confidential tokens on Sui reach for.',
	},
];

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Section({ id, children }: { id?: string; children: ReactNode }) {
	return (
		<section id={id} style={{ display: 'flex', flexDirection: 'column', gap: space.s5, scrollMarginTop: '72px' }}>
			{children}
		</section>
	);
}

function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<span className="type-label" style={{ color: color.cipherReveal, letterSpacing: '0.1em' }}>
			{children}
		</span>
	);
}

function IconChip({ Icon }: { Icon: IconComponent }) {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: '40px',
				height: '40px',
				flexShrink: 0,
				borderRadius: radius.md,
				background: color.surfaceOverlay,
				color: color.cipherReveal,
			}}
		>
			<Icon size={20} />
		</span>
	);
}

const cardStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: space.s3,
	padding: space.s5,
	...glass,
	borderRadius: radius.lg,
};

const grid: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
	gap: space.s4,
};

function CardGrid({ cards }: { cards: readonly Card[] }) {
	return (
		<div style={grid}>
			{cards.map((c) => (
				<article key={c.tag} style={cardStyle}>
					<IconChip Icon={c.Icon} />
					<span className="type-label" style={{ color: color.cipherReveal }}>
						{c.tag}
					</span>
					<h3 className="type-heading" style={{ margin: 0, color: color.inkPrimary }}>
						{c.title}
					</h3>
					<p className="type-caption" style={{ margin: 0, color: color.inkSecondary, lineHeight: 1.5 }}>
						{c.body}
					</p>
				</article>
			))}
		</div>
	);
}

// The hero "proof receipt" — makes the abstract idea concrete at first sight.
function ProofReceipt() {
	const row: React.CSSProperties = {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		gap: space.s3,
		padding: `${space.s2} 0`,
	};
	return (
		<div
			style={{
				flex: '1 1 320px',
				maxWidth: '420px',
				...cardStyle,
				...glassStrong,
				padding: space.s5,
				gap: space.s3,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: space.s2 }}>
				<span style={{ color: color.verified, display: 'inline-flex' }}>
					<IconBadgeCheck size={18} />
				</span>
				<span className="type-label" style={{ color: color.verified }}>
					Verified
				</span>
				<span className="type-caption" style={{ color: color.inkSecondary, marginLeft: 'auto' }}>
					Acme Lender · proof of income
				</span>
			</div>

			<div style={{ borderTop: `1px solid ${color.borderHairline}`, paddingTop: space.s2 }}>
				<div style={row}>
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						Disclosed
					</span>
					<span className="type-data-lg" style={{ color: color.inkPrimary }}>
						≥ $45,000 ✓
					</span>
				</div>
				<div style={{ ...row, borderTop: `1px solid ${color.borderHairline}` }}>
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						Hidden 🔒
					</span>
					<span className="type-caption" style={{ color: color.inkSecondary, textAlign: 'right' }}>
						your balance · which payments · your key
					</span>
				</div>
			</div>

			<span className="type-caption" style={{ color: color.inkDisabled }}>
				128-byte proof · verified in the browser · no key shared
			</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Landing({ onEnter }: LandingProps) {
	return (
		<div data-testid="landing" style={{ background: 'transparent' }}>
			<div
				style={{
					maxWidth: '1040px',
					margin: '0 auto',
					padding: `${space.s12} ${space.pageMargin} ${space.s16}`,
					display: 'flex',
					flexDirection: 'column',
					gap: space.s16,
				}}
			>
				{/* Hero — concrete protagonist + a visual receipt */}
				<section style={{ display: 'flex', flexWrap: 'wrap', gap: space.s8, alignItems: 'center' }}>
					<div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: space.s5 }}>
						<Eyebrow>Confidential compliance &amp; disclosure on Sui</Eyebrow>
						<h1
							className="type-display"
							style={{ margin: 0, color: color.inkPrimary, fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1.1 }}
						>
							Prove what you earn — without showing your bank statement.
						</h1>
						<p className="type-body" style={{ margin: 0, color: color.inkSecondary, fontSize: '16px', maxWidth: '560px' }}>
							Sui hides your amounts on-chain. Aperture lets you prove a <strong>total</strong> about
							that encrypted activity — to a lender, auditor, or regulator — without revealing the
							rest, and without handing over your key.
						</p>
						<div style={{ display: 'flex', alignItems: 'center', gap: space.s4, flexWrap: 'wrap' }}>
							<ButtonPrimary onClick={onEnter} data-action="enter-demo">
								<span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s2 }}>
									Enter the demo <IconArrowRight size={16} />
								</span>
							</ButtonPrimary>
							<span className="type-caption" style={{ color: color.inkSecondary }}>
								No SUI required · connect Slush &amp; sign once
							</span>
						</div>
					</div>
					<ProofReceipt />
				</section>

				{/* Regulatory stat strip */}
				<section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: space.s4 }}>
					{STATS.map((s) => (
						<div key={s.value} style={cardStyle}>
							<span className="type-data-lg" style={{ color: color.inkPrimary }}>
								{s.value}
							</span>
							<span className="type-caption" style={{ color: color.inkSecondary }}>
								{s.label}
							</span>
						</div>
					))}
				</section>

				{/* The gap */}
				<Section>
					<Eyebrow>The gap</Eyebrow>
					<CardGrid cards={CARDS} />
				</Section>

				{/* How it works — flow diagram */}
				<Section id="how">
					<Eyebrow>How it works, step by step</Eyebrow>
					<FlowDiagram />
				</Section>

				{/* Why Sui */}
				<Section id="why-sui">
					<Eyebrow>Why this matters for Sui</Eyebrow>
					<CardGrid cards={WHY_SUI} />
				</Section>

				{/* Use cases */}
				<Section id="use-cases">
					<Eyebrow>Where it fits</Eyebrow>
					<div style={grid}>
						{USE_CASES.map((u) => (
							<article key={u.title} style={cardStyle}>
								<IconChip Icon={u.Icon} />
								<h3 className="type-heading" style={{ margin: 0, color: color.inkPrimary }}>
									{u.title}
								</h3>
								<p className="type-caption" style={{ margin: 0, color: color.inkSecondary }}>
									{u.body}
								</p>
							</article>
						))}
					</div>
				</Section>

				{/* Built to last — sustainability */}
				<Section>
					<Eyebrow>Built to last</Eyebrow>
					<div style={grid}>
						{MODEL.map((m) => (
							<div key={m.tag} style={cardStyle}>
								<span className="type-label" style={{ color: color.cipherReveal }}>
									{m.tag}
								</span>
								<p className="type-caption" style={{ margin: 0, color: color.inkSecondary }}>
									{m.body}
								</p>
							</div>
						))}
					</div>
					<span className="type-caption" style={{ color: color.inkDisabled }}>
						Open-core compliance infrastructure — the issuer is the customer; the holder demo shows the
						capability.
					</span>
				</Section>

				{/* Where this is going — roadmap (forward-looking, not shipped capability) */}
				<Section id="roadmap">
					<Eyebrow>Where this is going</Eyebrow>
					<div style={grid}>
						{ROADMAP.map((r) => (
							<div key={r.phase} style={cardStyle}>
								<div
									style={{
										display: 'flex',
										alignItems: 'baseline',
										justifyContent: 'space-between',
										gap: space.s3,
									}}
								>
									<span className="type-label" style={{ color: color.cipherReveal }}>
										{r.phase}
									</span>
									<span className="type-label" style={{ color: color.inkSecondary }}>
										{r.when}
									</span>
								</div>
								<p className="type-caption" style={{ margin: 0, color: color.inkSecondary, lineHeight: 1.5 }}>
									{r.body}
								</p>
							</div>
						))}
					</div>
					<span className="type-caption" style={{ color: color.inkDisabled }}>
						Roadmap, not shipped capability — today's build runs the <strong>Now</strong> column.
					</span>
				</Section>

				{/* Final CTA */}
				<section style={{ ...cardStyle, alignItems: 'center', textAlign: 'center', gap: space.s4, padding: space.s10 }}>
					<h2 className="type-display" style={{ margin: 0, color: color.inkPrimary }}>
						See the proof, end to end.
					</h2>
					<p className="type-body" style={{ margin: 0, color: color.inkSecondary, maxWidth: '520px' }}>
						Connect a wallet, prove a figure, and watch a verifier confirm it — without your key, in
						under a second.
					</p>
					<ButtonPrimary onClick={onEnter}>
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s2 }}>
							Enter the demo <IconArrowRight size={16} />
						</span>
					</ButtonPrimary>
				</section>
			</div>
		</div>
	);
}
