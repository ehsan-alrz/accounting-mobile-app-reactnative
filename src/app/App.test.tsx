import { render, screen } from '@testing-library/react-native';

import App from './App';

describe('App', () => {
  it('renders the Ledgerly shell without console errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await render(<App />);

    expect(screen.getByText('Ledgerly')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
