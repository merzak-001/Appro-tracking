// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { SensusLogo } from '../src/components/SensusLogo';
import { DateInputDDMMYYYY } from '../src/components/DateInputDDMMYYYY';
import { SearchableSelect } from '../src/components/SearchableSelect';
import { SuiviProduction } from '../src/components/SuiviProduction';
import { Layout } from '../src/components/Layout';
import { LanguageProvider } from '../src/context/LanguageContext';

vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('SensusLogo Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders company logo image with alt text', () => {
    render(<SensusLogo />);
    const logoImg = screen.getByAltText('Logo Société');
    expect(logoImg).toBeDefined();
  });
});

describe('DateInputDDMMYYYY Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders input with formatted date value DD/MM/YYYY', () => {
    const handleChange = vi.fn();
    render(<DateInputDDMMYYYY value="2026-08-15" onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText('JJ/MM/AAAA') as HTMLInputElement;
    expect(input.value).toBe('15/08/2026');
  });

  it('triggers onChange with converted ISO string YYYY-MM-DD on valid date entry', () => {
    const handleChange = vi.fn();
    render(<DateInputDDMMYYYY value="2026-08-15" onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText('JJ/MM/AAAA') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '20/09/2026' } });
    
    expect(handleChange).toHaveBeenCalledWith('2026-09-20');
  });
});

describe('SearchableSelect Component', () => {
  beforeEach(() => {
    cleanup();
  });

  const options = [
    { value: 1, label: 'Supplier Alpha', subLabel: 'Algeria' },
    { value: 2, label: 'Supplier Beta', subLabel: 'France' },
  ];

  it('renders selected option label', () => {
    render(<SearchableSelect options={options} value={1} onChange={() => {}} />);
    expect(screen.getByText('Supplier Alpha')).toBeDefined();
  });

  it('opens options list when clicked and allows selecting an option', () => {
    const handleChange = vi.fn();
    render(<SearchableSelect options={options} value={1} onChange={handleChange} />);
    
    const triggerBtn = screen.getByText('Supplier Alpha');
    fireEvent.click(triggerBtn);

    expect(screen.getByText('Supplier Beta')).toBeDefined();
    fireEvent.click(screen.getByText('Supplier Beta'));

    expect(handleChange).toHaveBeenCalledWith(2);
  });
});

describe('SuiviProduction Component', () => {
  beforeEach(() => {
    cleanup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);
  });

  it('renders Suivi de Production header and import action button', async () => {
    await act(async () => {
      render(<SuiviProduction />);
    });
    expect(screen.getByText('Suivi de Production')).toBeDefined();
    expect(screen.getAllByText(/Importer Excel MCBA/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Tableau de Suivi Mensuel')).toBeDefined();
    expect(screen.getByText('Graphiques & Analyses Multi-Années')).toBeDefined();
    expect(screen.getByText('Tableau de Bord & Budget')).toBeDefined();
  });

  it('switches to Tableau de Bord & Budget tab when clicked', async () => {
    await act(async () => {
      render(<SuiviProduction />);
    });

    const productMoisTab = screen.getByText('Tableau de Bord & Budget');
    await act(async () => {
      fireEvent.click(productMoisTab);
    });

    expect(screen.getAllByText(/Tableau de Bord & Budget/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Budget & Prix/i)).toBeDefined();
    expect(screen.getByText(/Notes & Remarques Opérationnelles/i)).toBeDefined();
  });
});

describe('Layout Navigation Permissions', () => {
  beforeEach(() => {
    cleanup();
  });

  it('restricts Salem Ferdjallah to only Suivi Production and CAPEX pages', () => {
    const salemUser = {
      id: 5,
      username: 'Salem.ferdjallah',
      full_name: 'Salem Ferdjallah',
      role: 'Chef Service' as const,
    };

    render(
      <LanguageProvider>
        <Layout
          currentUser={salemUser}
          activeTab="suivi-production"
          setActiveTab={() => {}}
          onLogout={() => {}}
          onOpenSqlModal={() => {}}
        >
          <div>Content</div>
        </Layout>
      </LanguageProvider>
    );

    expect(screen.getByTitle('Suivi Production')).toBeDefined();
    expect(screen.getByTitle('Suivi Investissements CAPEX')).toBeDefined();
    expect(screen.queryByTitle('Commandes Locales')).toBeNull();
    expect(screen.queryByTitle('Fournisseurs')).toBeNull();
    expect(screen.queryByTitle('Situation Stock')).toBeNull();
  });

  it('restricts Brahimi Mohamed to only Suivi Production page', () => {
    const brahimiUser = {
      id: 2,
      username: 'mohamed.brahimi',
      full_name: 'Brahimi, Mohamed',
      role: 'Appro' as const,
      allowed_pages: ['suivi-production'],
    };

    render(
      <LanguageProvider>
        <Layout
          currentUser={brahimiUser}
          activeTab="suivi-production"
          setActiveTab={() => {}}
          onLogout={() => {}}
          onOpenSqlModal={() => {}}
        >
          <div>Content</div>
        </Layout>
      </LanguageProvider>
    );

    expect(screen.getByTitle('Suivi Production')).toBeDefined();
    expect(screen.queryByTitle('Suivi Investissements CAPEX')).toBeNull();
    expect(screen.queryByTitle('Commandes Locales')).toBeNull();
    expect(screen.queryByTitle('Tableau de Bord')).toBeNull();
    expect(screen.queryByTitle('Situation Stock')).toBeNull();
  });
});

