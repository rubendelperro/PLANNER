describe('Proyecto PLANNER - test de ejemplo', () => {
  it('lee index.html y contiene la etiqueta title', () => {
    // Leer el archivo directamente desde el proyecto
    cy.readFile('index.html').should('contain', '<title');
  });
});
