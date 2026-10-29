import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Header } from '../components/Header';
import { LanguageProvider } from '../context/LanguageContext';
import { updateSession } from '../utils/session';
import { fetchProfile } from '../api/auth';

vi.mock('../api/auth', () => ({ fetchProfile: vi.fn().mockResolvedValue({ avatarUrl: null }) }));
vi.mock('../components/AreaModal', () => ({ AreaModal: () => <div>area-popup</div> }));
vi.mock('../router', async (orig) => ({ ...(await orig<typeof import('../router')>()), Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

const header = () => render(
  <LanguageProvider>
    <Header currentLocationName="Giza" currentPoint={{ lat: 30, lng: 31 }} onLocationSelect={() => undefined} onRequestGps={() => undefined} isGpsLoading={false} />
  </LanguageProvider>,
);

describe('Header', () => {
  it('shows the first name and a marker that opens the location menu', () => {
    updateSession({ name: 'Mostafa Ahmed Ali' });
    const { container } = header();
    expect(screen.getByText('Mostafa')).toBeTruthy();
    expect(screen.queryByText(/Ahmed/)).toBeNull();
    expect(screen.queryByText('Giza')).toBeNull();

    // The marker is the button that names the location prompt; it opens the menu (no saved area in this test).
    expect(container.querySelector('div.absolute.top-full')).toBeNull();
    fireEvent.click(container.querySelector('button[aria-label]') as HTMLElement);
    expect(container.querySelector('div.absolute.top-full')).not.toBeNull();
  });

  it('with a photo shows it and hides the name on a narrow header; the name stays visible when there is no photo', async () => {
    updateSession({ name: 'Mostafa Ahmed Ali', token: 't' });
    vi.mocked(fetchProfile).mockResolvedValueOnce({ avatarUrl: 'https://x.test/me.jpg' } as Awaited<ReturnType<typeof fetchProfile>>);
    const { container } = header();

    await waitFor(() => expect(container.querySelector('img[src="https://x.test/me.jpg"]')).not.toBeNull());
    // Tailwind: hidden below 420px, inline from there.
    expect(screen.getByText('Mostafa').className).toContain('hidden');
    expect(screen.getByText('Mostafa').className).toContain('min-[420px]:inline');
  });

  it('without a photo the name is never hidden', () => {
    updateSession({ name: 'Mostafa Ahmed Ali', token: undefined });
    header();
    expect(screen.getByText('Mostafa').className).not.toContain('hidden');
  });
});
