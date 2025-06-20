import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accessToken = searchParams.get('token');

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token required' }, { status: 400 });
  }

  try {
    // Fetch user's repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: errorData.message || 'Failed to fetch repositories' 
      }, { status: response.status });
    }

    const repositories = await response.json();

    // Format repositories for easier use
    const formattedRepos = repositories.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }));

    return NextResponse.json({ repositories: formattedRepos });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, repository } = await request.json();

    if (!accessToken || !repository) {
      return NextResponse.json({ error: 'Access token and repository required' }, { status: 400 });
    }

    // Fetch branches for the selected repository
    const response = await fetch(`https://api.github.com/repos/${repository}/branches`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: errorData.message || 'Failed to fetch branches' 
      }, { status: response.status });
    }

    const branches = await response.json();

    // Format branches for easier use
    const formattedBranches = branches.map((branch: any) => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
    }));

    return NextResponse.json({ branches: formattedBranches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 