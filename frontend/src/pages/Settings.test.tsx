import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Settings from './Settings';
import client from '../api/client';
import { BrowserRouter } from 'react-router-dom';

// Mock the API client
vi.mock('../api/client');

describe('Settings Page', () => {
    it('renders without crashing even with empty data', async () => {
        // Mock successful but empty responses
        (client.get as any).mockImplementation((url: string) => {
            if (url === '/auth/me') return Promise.resolve({ data: { user: {} } });
            if (url === '/settings/connections') return Promise.resolve({ data: { spotify: false, subsonic: [] } });
            if (url === '/settings/kb') return Promise.resolve({ data: [] });
            if (url === '/api/settings/ai') return Promise.resolve({ data: { configured: false } });
            return Promise.reject(new Error('not found'));
        });

        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });
    });

    it('handles undefined arrays gracefully', async () => {
        // Mock strictly undefined/malformed responses to test safety checks
        (client.get as any).mockImplementation((url: string) => {
            if (url === '/auth/me') return Promise.resolve({ data: { user: {} } });
            // FORCE UNDEFINED for arrays to trigger the crash if safety checks are missing
            if (url === '/settings/connections') return Promise.resolve({ data: { spotify: false, subsonic: undefined } });
            if (url === '/settings/kb') return Promise.resolve({ data: undefined });
            if (url === '/api/settings/ai') return Promise.resolve({ data: { configured: false } });
            return Promise.reject(new Error('not found'));
        });

        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Should verify it renders "No servers connected" or similar fallback state
        await waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
            // Check if fallback text appears (depending on implementation)
        });
    });
});
