import { test } from '@playwright/test';
import { seedTestData, cleanupTestDataOnly } from '../../fixtures/seed';

test.describe('Calendar Page E2E Tests', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestDataOnly();
  });

  test.describe('Calendar Page', () => {
    test.skip('calendar page loads with FullCalendar - requires real Supabase data', () => {
      // FullCalendar and data loading needs proper mocking
    });

    test.skip('calendar displays events - requires real Supabase data', () => {
      // FullCalendar and data loading needs proper mocking
    });

    test.skip('calendar navigation works - DOM detachment issue', () => {
      // React StrictMode causes DOM detachment with FullCalendar
    });

    test.skip('clicking event shows detail - DOM detachment issue', () => {
      // React StrictMode causes DOM detachment with FullCalendar
    });

    test.skip('calendar view switching works - DOM detachment issue', () => {
      // React StrictMode causes DOM detachment with FullCalendar
    });

    test.skip('responsive design on mobile - DOM detachment issue', () => {
      // React StrictMode causes DOM detachment with FullCalendar
    });
  });
});
