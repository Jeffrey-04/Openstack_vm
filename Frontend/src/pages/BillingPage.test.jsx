import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import BillingPage from './BillingPage';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getInvoices: jest.fn().mockResolvedValue({ success: true, invoices: [] }),
  },
}));

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('BillingPage', () => {
  test('affiche le titre Facturation après chargement', async () => {
    renderWithProviders(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /facturation/i })).toBeInTheDocument();
    });
  });

  test('affiche Mes factures dans la section liste', async () => {
    renderWithProviders(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByText(/mes factures/i)).toBeInTheDocument();
    });
  });
});
