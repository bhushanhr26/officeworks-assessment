import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { makeProduct } from '../../test/fixtures';
import { makeApiStub, renderApp } from '../../test/render-app';

const product = makeProduct({ id: '7', title: 'Gold Ring' });

function setup() {
  const api = makeApiStub();
  api.getProduct.mockResolvedValue(product);
  api.submitEnquiry.mockResolvedValue({ status: 'accepted' });
  return api;
}

async function openForm(api = setup()) {
  const utils = renderApp('/products/7/enquire', api);
  await screen.findByRole('heading', { name: 'Enquire about Gold Ring' });
  return utils;
}

describe('Enquiry form', () => {
  it('is reached from the product page Enquire button', async () => {
    const { user } = renderApp('/products/7', setup());

    await user.click(await screen.findByRole('link', { name: 'Enquire' }));

    expect(
      await screen.findByRole('heading', { name: 'Enquire about Gold Ring' }),
    ).toBeInTheDocument();
  });

  it('shows field errors, focuses the first one, and does not submit', async () => {
    const { user, api } = await openForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const name = screen.getByLabelText('Name');
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Name is required');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email');
    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription('Message is required');
    expect(screen.getByLabelText('Phone (optional)')).not.toHaveAttribute('aria-invalid');
    expect(api.submitEnquiry).not.toHaveBeenCalled();
  });

  it('clears a field error as the user fixes it', async () => {
    const { user } = await openForm();
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Name'), 'A');

    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('submits valid details and shows the Thank you message', async () => {
    const { user, api } = await openForm();

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Is this available in size 7?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const heading = await screen.findByRole('heading', { name: 'Thank you' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/ada@example.com/)).toBeInTheDocument();
    expect(api.submitEnquiry).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '',
      message: 'Is this available in size 7?',
      productId: '7',
      website: '',
    });
  });

  it('shows the server error and keeps the form when submission fails', async () => {
    const api = setup();
    api.submitEnquiry.mockRejectedValue(new ApiRequestError('RATE_LIMITED', 'Too many', 429));
    const { user } = await openForm(api);

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('wait a few minutes');
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
  });

  it('shows a retryable message on a server error, and a retry can succeed', async () => {
    const api = setup();
    api.submitEnquiry
      .mockRejectedValueOnce(new ApiRequestError('UPSTREAM_ERROR', 'SMTP down', 502))
      .mockResolvedValueOnce({ status: 'accepted' });
    const { user } = await openForm(api);

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Please try again shortly');
    expect(alert).not.toHaveTextContent('SMTP down');
    const button = screen.getByRole('button', { name: 'Send enquiry' });
    expect(button).toBeEnabled();

    await user.click(button);

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(api.submitEnquiry).toHaveBeenCalledTimes(2);
  });

  it('hides the honeypot from users and assistive tech', async () => {
    await openForm();
    expect(screen.queryByRole('textbox', { name: /website/i })).not.toBeInTheDocument();
    expect(document.getElementById('enquiry-website')).toHaveAttribute('tabindex', '-1');
  });

  it('shows not found for an unknown product', async () => {
    const api = setup();
    api.getProduct.mockRejectedValue(new ApiRequestError('NOT_FOUND', 'nope', 404));
    renderApp('/products/999/enquire', api);
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});
