const { test: setup, expect } = require('@playwright/test');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
	const baseURL  = process.env.WP_BASE_URL    || 'https://wordpress.local';
	const user     = process.env.WP_ADMIN_USER;
	const password = process.env.WP_ADMIN_PASS;

	await page.goto(`${ baseURL }/wp-login.php`);
	await page.fill('#user_login', user);
	await page.fill('#user_pass', password);
	await page.click('#wp-submit');

	await expect(page).toHaveURL(/wp-admin|dashboard/, { timeout: 10_000 });

	await page.context().storageState({ path: STORAGE_STATE });
});
