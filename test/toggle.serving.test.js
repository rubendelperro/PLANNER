import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

// Load the app modules in testable form
import { initializeEvents, attachEventListeners } from '../events.js';
import '../render.js';

describe('Toggle serving behavior', () => {
  let window, document, container;

  beforeEach(() => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '..', 'index.html'),
      'utf8'
    );
    const dom = new JSDOM(html);
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    // Minimal DOM for the nutrient value and buttons
    container = document.createElement('div');
    container.innerHTML = `
      <div id="item-detail" data-item-id="item-1">
        <div class="tracked-nutrients">
          <span class="nutrient-value" data-per100g="10" data-perserving="" data-target="" data-unit="g">10</span>
        </div>
        <div class="toggle-group">
          <button id="per-100g-btn" class="toggle active">100g</button>
          <button id="per-serving-btn" class="toggle">Ración</button>
          <button id="per-package-btn" class="toggle" style="display:none">Paquete</button>
          <button id="per-unit-btn" class="toggle" style="display:none">Unidad</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // stub a simple state expected by events.js
    global.state = {
      ui: { editingItemId: 'item-1' },
      items: {
        byId: {
          'item-1': {
            itemType: 'ingrediente',
            nutrients: { servingSizeGrams: 50 },
          },
        },
      },
    };

    // Initialize events module with a noop dispatch and a getState that returns our test state
    initializeEvents(
      () => {},
      () => global.state
    );
    // Attach delegated listeners to our test container so clicks are handled
    attachEventListeners(container);
  });

  it('computes per-serving on-the-fly when data-perserving is missing', () => {
    const valueSpan = document.querySelector('.nutrient-value');
    const servingBtn = document.getElementById('per-serving-btn');

    // initial should be per100g
    expect(valueSpan.textContent).toBe('10');

    // click the Ración button
    servingBtn.click();

    // per-serving should be per100g * servingSizeGrams / 100
    // 10 * 50 / 100 = 5 (and unit 'g' is appended by render)
    expect(valueSpan.textContent).toBe('5g');
  });
});
