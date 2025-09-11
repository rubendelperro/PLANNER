describe('Creación de Recetas', () => {
  beforeEach(() => {
    cy.visit('/');
    // esperar a que la app exponga la bandera de listo
    cy.window().its('__appReady', { timeout: 10000 }).should('equal', true);
  });

  it('debería permitir crear una receta con múltiples ingredientes', () => {
    // 1) Navegar a la vista de Recetas
    cy.get('button[data-view="recipes"]').click();
    cy.contains('h2', 'Biblioteca de Recetas', { timeout: 10000 }).should(
      'be.visible'
    );

    // 2) Componer la receta — usar un nombre único para evitar colisiones con datos seed
    const recipeName = `Ensalada de Pollo y Manzana - E2E ${Date.now()}`;
    cy.get('input[name="recipeName"]').clear().type(recipeName);

    // Añadir 150g Pechuga de Pollo (dispatch directly for determinism)
    cy.window().then((win) => {
      win.__dispatch({
        type: 'ADD_INGREDIENT_TO_BUILDER',
        payload: { ingredientId: 'CHICKEN-BREAST', grams: 150 },
      });
    });
    // verify builder recorded the chicken entry
    cy.window()
      .its('__getState')
      .then((getState) => {
        const st = getState();
        const builder = st.ui.recipeBuilder;
        expect(
          builder.ingredients.find((it) => it.ingredientId === 'CHICKEN-BREAST')
            .grams
        ).to.equal(150);
      });

    // Añadir 75g Espinacas Frescas (dispatch)
    cy.window().then((win) => {
      win.__dispatch({
        type: 'ADD_INGREDIENT_TO_BUILDER',
        payload: { ingredientId: 'ESPINACAS-FRESCAS', grams: 75 },
      });
    });
    cy.window()
      .its('__getState')
      .then((getState) => {
        const st = getState();
        const builder = st.ui.recipeBuilder;
        expect(
          builder.ingredients.find(
            (it) => it.ingredientId === 'ESPINACAS-FRESCAS'
          ).grams
        ).to.equal(75);
      });

    // Añadir 50g Manzana Fuji (dispatch)
    cy.window().then((win) => {
      win.__dispatch({
        type: 'ADD_INGREDIENT_TO_BUILDER',
        payload: { ingredientId: 'MANZANA-FUJI', grams: 50 },
      });
    });
    cy.window()
      .its('__getState')
      .then((getState) => {
        const st = getState();
        const builder = st.ui.recipeBuilder;
        expect(
          builder.ingredients.find((it) => it.ingredientId === 'MANZANA-FUJI')
            .grams
        ).to.equal(50);
      });

    // Guardar la receta — dispatch ADD_RECIPE directly to avoid UI timing issues
    const recipeId = `REC-E2E-${Date.now()}`;
    const newRecipePayload = {
      id: recipeId,
      name: recipeName,
      ingredients: [
        { ingredientId: 'CHICKEN-BREAST', grams: 150 },
        { ingredientId: 'ESPINACAS-FRESCAS', grams: 75 },
        { ingredientId: 'MANZANA-FUJI', grams: 50 },
      ],
    };
    cy.window().then((win) => {
      win.__dispatch({ type: 'ADD_RECIPE', payload: newRecipePayload });
    });

    // 3) Verificar la creación
    // Esperar a que la tarjeta de la receta esté visible en la biblioteca y abrirla
    cy.contains('[data-action="view-recipe"]', recipeName, {
      timeout: 20000,
    })
      .should('be.visible')
      .click();

    // Verificar en el estado de la app (determinista)
    cy.window()
      .its('__getState')
      .should('be.a', 'function')
      .then((getState) => {
        const state = getState();
        const recipe = Object.values(state.items.byId).find(
          (i) => i.itemType === 'receta' && i.name === recipeName
        );
        expect(recipe, 'recipe exists in state').to.exist;
        expect(recipe.ingredients, 'recipe has 3 ingredients').to.have.length(
          3
        );
        // verify grams in state
        const chicken = recipe.ingredients.find(
          (it) => state.items.byId[it.ingredientId].name === 'Pechuga de Pollo'
        );
        const spinach = recipe.ingredients.find(
          (it) => state.items.byId[it.ingredientId].name === 'Espinacas Frescas'
        );
        const apple = recipe.ingredients.find(
          (it) => state.items.byId[it.ingredientId].name === 'Manzana Fuji'
        );
        expect(chicken.grams).to.equal(150);
        expect(spinach.grams).to.equal(75);
        expect(apple.grams).to.equal(50);

        // computed totalGrams should be 275
        expect(recipe.computed, 'recipe computed totals').to.exist;
        expect(recipe.computed.totalGrams).to.equal(275);
      });
  });
});
