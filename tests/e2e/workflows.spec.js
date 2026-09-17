import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.describe.configure({ mode: 'serial' });
const screenshots = '.data/screenshots';
async function waitForDashboard(page) {
  await expect(page.getByRole('heading', { name: 'Vue d’ensemble', exact: true })).toBeVisible();
  await expect(page.locator('.page-content > div').last()).toHaveCSS('opacity', '1');
  await expect(page.locator('.donut-container .recharts-sector').first()).toBeVisible();
}
async function capture(page, filename) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshots}/${filename}`, fullPage: true, animations: 'disabled' });
}
async function login(page, label = 'Administrateur') {
  await page.goto('/');
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await waitForDashboard(page);
}
test('interface : navigation complète, recherche, thèmes et affichage mobile', async ({ page }) => {
  await mkdir(screenshots, { recursive: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenue dans Sentinel' })).toBeVisible();
  await capture(page, 'connexion.png');
  await login(page);
  await expect(page.getByText('Tous vos systèmes sont opérationnels.')).toBeVisible();
  await capture(page, 'dashboard-dark.png');
  const routes = [
    ['/simulations', 'Scénarios de simulation'],
    ['/incidents', 'Centre des incidents'],
    ['/infrastructure', 'Infrastructure'],
    ['/files', 'Fichiers simulés'],
    ['/backups', 'Sauvegardes'],
    ['/integrity', 'Vérification d’intégrité'],
    ['/recovery', 'Restauration'],
    ['/recovery-plan', 'Plan de reprise'],
    ['/reports', 'Rapports d’incident'],
    ['/users', 'Utilisateurs'],
    ['/logs', 'Journaux d’audit'],
    ['/settings', 'Paramètres'],
  ];
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Activer le mode clair' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await waitForDashboard(page);
  await capture(page, 'dashboard-light.png');
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'Rechercher une page' }).fill('intégrité');
  await page.getByRole('dialog').getByRole('button', { name: 'Vérification d’intégrité' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vérification d’intégrité' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible();
  await waitForDashboard(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, 'dashboard-mobile.png');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('link', { name: 'Fichiers simulés', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fichiers simulés', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('SHA-256 : détection de la copie corrompue et vérification d’une copie saine', async ({ page }) => {
  await login(page);
  await page.goto('/integrity');
  await page.getByLabel('Sauvegarde à vérifier').selectOption('BKP-DEMO-FAIL');
  await page.getByRole('button', { name: 'Vérifier SHA-256', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Integrity check failed' })).toBeVisible();
  await capture(page, 'integrity-failed.png');
  await page
    .getByLabel('Sauvegarde à vérifier')
    .selectOption({ label: 'Sauvegarde complète · référence · 144 fichiers' });
  await page.getByRole('button', { name: 'Vérifier SHA-256', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Integrity verified' })).toBeVisible();
});
test('exercice complet : sauvegarde, simulation, restauration partielle puis totale, rapport PDF et JSON', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.goto('/backups');
  await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).click();
  await page.getByLabel('Nom de la sauvegarde').fill('Copie avant exercice navigateur');
  await page.getByRole('button', { name: 'Créer la sauvegarde', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Copie avant exercice navigateur', { exact: true })).toBeVisible();
  await page.goto('/simulations');
  await page.getByRole('button', { name: /Votre scénario, vos règles/ }).click();
  await page.getByLabel('Nombre de fichiers affectés').fill('4');
  await page.getByRole('checkbox', { name: 'SERVER-FILES-01', exact: true }).check();
  await page
    .getByPlaceholder('Ex. Exercice de reprise — département finance')
    .fill('Exercice de validation navigateur');
  await capture(page, 'simulations.png');
  await page.getByRole('button', { name: 'Lancer la simulation', exact: true }).click();
  await page.getByRole('button', { name: 'Lancer l’exercice', exact: true }).click();
  await page.getByRole('link', { name: 'Prendre en charge l’incident' }).click();
  await expect(page.getByRole('heading', { name: 'Contenir l’incident' })).toBeVisible();
  await capture(page, 'recovery-incident.png');
  await page.getByRole('button', { name: 'Isoler les systèmes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’analyse', exact: true }).click();
  await page.getByRole('button', { name: 'Sélectionner cette sauvegarde', exact: true }).click();
  await page.getByRole('button', { name: 'Vérifier les empreintes SHA-256', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Restaurer les données fictives' })).toBeVisible();
  await page.locator('.restore-file-list input').first().uncheck();
  await page.getByRole('button', { name: 'Restaurer la sélection', exact: true }).click();
  await expect(page.locator('.recovery-progress')).toContainText('75 %');
  await page.getByRole('checkbox', { name: 'Tout sélectionner', exact: true }).check();
  await page.getByRole('button', { name: 'Restaurer la sélection', exact: true }).click();
  await page.getByRole('button', { name: 'Contrôler l’intégrité finale', exact: true }).click();
  await page.getByRole('button', { name: 'Réactiver les services', exact: true }).click();
  await page.getByRole('button', { name: 'Clôturer l’incident', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Votre organisation a rebondi.' })).toBeVisible();
  await capture(page, 'recovery-complete.png');
  await page.getByRole('link', { name: 'Consulter le rapport', exact: true }).click();
  await expect(page.locator('.report-document')).toContainText('100 %');
  await expect(page.locator('.report-document')).toContainText('Intégrité vérifiée');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^sentinel-INC-.+\.json$/);
  await capture(page, 'rapport.png');
  await page.pdf({ path: `${screenshots}/rapport-exemple.pdf`, format: 'A4', printBackground: true });
  expect(errors).toEqual([]);
});
test('droits analyste/utilisateur, protection des routes et déconnexion réelle', async ({ page }) => {
  await login(page, 'Analyste');
  await page.goto('/simulations');
  await expect(page.getByRole('button', { name: 'Lancer la simulation', exact: true })).toBeDisabled();
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Vue d’ensemble', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue dans Sentinel' })).toBeVisible();
  await login(page, 'Utilisateur');
  await page.goto('/files');
  await expect(page.getByRole('heading', { name: 'Fichiers simulés', exact: true })).toBeVisible();
  await expect(page.locator('.file-stats-strip')).toContainText('36');
  await expect(page.getByRole('link', { name: 'Sauvegardes', exact: true })).toHaveCount(0);
  await page.goto('/integrity');
  await expect(page.getByRole('heading', { name: 'Vue d’ensemble', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.goto('/files');
  await expect(page.getByRole('heading', { name: 'Bienvenue dans Sentinel' })).toBeVisible();
});
