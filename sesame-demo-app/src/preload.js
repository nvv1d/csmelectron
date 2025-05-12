// preload.js

window.addEventListener('DOMContentLoaded', () => {
  // 1) Kill all scrolling immediately
  const docEl = document.documentElement;
  Object.assign(docEl.style, {
    overflow: 'hidden',
    height:   '100%',
    margin:   '0',
    padding:  '0'
  });
  Object.assign(document.body.style, {
    overflow: 'hidden',
    height:   '100%',
    margin:   '0',
    padding:  '0'
  });

  // 2) Remove any header/nav/banner that might flash
  document.querySelectorAll('header, nav, [role="banner"], .site-header, .navbar')
          .forEach(el => el.remove());

  // 3) Set up an observer to wait for the demo section to mount
  const observer = new MutationObserver((mutations, obs) => {
    const heading = document.querySelector('h3.text-research-h2');
    const demo    = document.querySelector('[data-sentry-component="Visualizer"]');
    if (heading && demo) {
      // Found it—tear out everything else:
      try {
        // Collect heading + all following siblings (viz panel, prompt, footnotes)
        const nodes = [];
        let el = heading;
        while (el) {
          nodes.push(el);
          el = el.nextElementSibling;
        }

        // Wrap them in a fresh container
        const wrapper = document.createElement('div');
        wrapper.id = 'demo-only-wrapper';
        Object.assign(wrapper.style, {
          width:      '691px',
          margin:     '16px auto',
          overflow:   'hidden',
          background: '#e8ede4',
        });
        nodes.forEach(n => wrapper.appendChild(n));

        // Replace the entire page
        document.body.innerHTML = '';
        document.body.appendChild(wrapper);
      } catch (e) {
        console.error('Error isolating demo:', e);
      }
      // Stop observing once done
      obs.disconnect();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree:   true
  });
});
