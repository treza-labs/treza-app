import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    // Redirect back to the enclave page with error
    return NextResponse.redirect(
      new URL(`/platform?github_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/platform?github_error=no_code', request.url)
    );
  }

  try {
    // Exchange code for access token
    const response = await fetch(`${request.nextUrl.origin}/api/github/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.redirect(
        new URL(`/platform?github_error=${encodeURIComponent(data.error)}`, request.url)
      );
    }

    // Store the GitHub connection data in session/localStorage via URL params
    // In a real app, you'd probably store this more securely
    const redirectUrl = new URL('/platform', request.url);
    redirectUrl.searchParams.set('github_success', 'true');
    redirectUrl.searchParams.set('github_user', data.user.login);
    redirectUrl.searchParams.set('github_token', data.access_token);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in GitHub callback:', error);
    return NextResponse.redirect(
      new URL('/platform?github_error=callback_error', request.url)
    );
  }
} 