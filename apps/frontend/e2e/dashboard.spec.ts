import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E flow', () => {
  test('should login, view dashboard, and add a transaction', async ({ page }) => {
    // 1. Ir a la página de login
    await page.goto('/');

    // 2. Hacer login
    await page.fill('input[id="login-username"]', 'agustin');
    await page.fill('input[id="login-password"]', '123456');
    await page.click('button[id="login-submit"]');

    // 3. Verificar que entramos al dashboard (aparece el botón de Salir o Agregar transacción)
    await expect(page.getByText('Agregar transaccion')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('EQUILIBRIO')).toBeVisible();

    // 4. Abrir formulario
    await page.click('text="Agregar transaccion"');

    // 5. Rellenar formulario
    await page.fill('input[name="tickerFilter"]', 'AAPL');
    // Esperar a que el dropdown sugiera el ticker y seleccionarlo
    await page.click('button:has-text("AAPL")');

    await page.selectOption('select[name="type"]', 'BUY');
    
    // Fill Date with today
    const today = new Date().toISOString().slice(0, 10);
    await page.fill('input[name="date"]', today);

    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="price"]', '150');
    await page.fill('input[name="commission"]', '1');
    
    // Guardar transacción
    await page.click('button:has-text("Agregar transaccion")');

    // 6. Esperar a que el modal se cierre (el botón vuelve a decir "Agregar transaccion")
    await expect(page.locator('button', { hasText: /^Agregar transaccion$/ })).toBeVisible();
    
    // 7. Verificar que la transacción esté en la lista (AAPL)
    await expect(page.locator('text=AAPL').first()).toBeVisible();
  });
});
