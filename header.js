const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about.html', label: 'About' },
  { href: '/odds.html', label: 'Odds' },
  { href: '/contact.html', label: 'Contact' },
];

function renderSharedHeader() {
  const mountPoint = document.getElementById('site-header-root');
  if (!mountPoint) return;

  const linksMarkup = navLinks
    .map(({ href, label }) => `<li><a href="${href}">${label}</a></li>`)
    .join('');

  mountPoint.innerHTML = `
    <header class="site-header">
      <div class="brand-block" aria-label="Wanna Bet? by Malleable Gold">
        <a href="/" class="brand-link" aria-label="Go to homepage">
          <span class="brand-main">
            <span class="brand-wanna">Wanna</span><span class="brand-bet"> Bet?</span>
          </span>
          <span class="brand-subtitle">By Malleable Gold</span>
        </a>
      </div>

      <nav class="site-nav" aria-label="Main navigation">
        <ul class="nav-list" id="main-nav-list">${linksMarkup}</ul>
      </nav>
    </header>
  `;
}

renderSharedHeader();
