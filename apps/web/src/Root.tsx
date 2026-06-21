// apps/web/src/Root.tsx
//
// Top-level site shell + lightweight hash router: a real Landing page and a Demo
// page, wrapped in a shared sticky header (+ footer on the landing). Hash routing
// (#/ and #/demo) keeps links shareable and the back button working — no router
// dependency.

import { useEffect, useState } from 'react';

import App from './App';
import { Landing } from './features/landing/Landing';
import { SiteHeader, type SiteView } from './shared/components/SiteHeader';
import { SiteFooter } from './shared/components/SiteFooter';

function viewFromHash(): SiteView {
	if (typeof window === 'undefined') return 'landing';
	return window.location.hash.startsWith('#/demo') ? 'demo' : 'landing';
}

export default function Root() {
	const [view, setView] = useState<SiteView>(viewFromHash);

	// Keep state in sync with the URL hash (back/forward, shared links).
	useEffect(() => {
		const onHash = () => setView(viewFromHash());
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	function navigate(next: SiteView) {
		const target = next === 'demo' ? '#/demo' : '#/';
		if (window.location.hash !== target) window.location.hash = target;
		setView(next);
		window.scrollTo({ top: 0 });
	}

	return (
		<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<SiteHeader view={view} onLaunch={() => navigate('demo')} onHome={() => navigate('landing')} />

			<div style={{ flex: 1 }}>
				{view === 'demo' ? <App /> : <Landing onEnter={() => navigate('demo')} />}
			</div>

			{view === 'landing' && <SiteFooter />}
		</div>
	);
}
