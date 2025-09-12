// Create a lightweight cy.mount that inserts a component into a test root.
// We avoid calling the app-level `render()` which depends on global app state
// (ui.activeView, profiles, etc.). Component tests should mount isolated
// fragments instead.

function mount(component, props = {}) {
  // Use a dedicated container to avoid colliding with the app's real DOM
  const ROOT_ID = 'cypress-component-root';
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    // keep it visible so the Vite preview shows the component
    document.body.appendChild(root);
  }

  // clear previous contents
  root.innerHTML = '';

  // Support components that return a DOM node or an HTML string
  const fragment =
    typeof component === 'function' ? component(props) : component;
  if (fragment instanceof Node) {
    root.appendChild(fragment);
  } else if (typeof fragment === 'string') {
    root.innerHTML = fragment;
  } else if (fragment && fragment.nodeType) {
    root.appendChild(fragment);
  } else {
    // If it's an object (e.g., a virtual DOM or other), stringify for now
    root.innerHTML = String(fragment);
  }

  // Return the mounted root wrapped for convenience in tests
  return cy.wrap(root);
}

Cypress.Commands.add('mount', mount);
