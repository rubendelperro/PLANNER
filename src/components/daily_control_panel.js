export default function DailyControlPanel() {
  const container = document.createElement('div');
  container.innerHTML = `
    <section class="daily-control-panel">
      <h2>Panel de Control Diario</h2>
      <form>
        <label>Añadir Comida</label>
        <input />
      </form>
    </section>
  `;
  return container;
}
