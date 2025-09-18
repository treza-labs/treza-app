import { NextRequest, NextResponse } from 'next/server';

interface DockerHubImage {
  name?: string;
  repo_name?: string; // Sometimes the name field is called repo_name
  description?: string;
  short_description?: string; // Sometimes description is called short_description
  star_count?: number;
  is_official?: boolean;
  is_automated?: boolean;
  repo_owner?: string;
  user?: string; // Sometimes owner is called user
}

interface DockerHubSearchResponse {
  count: number;
  next?: string;
  previous?: string;
  results: DockerHubImage[];
}

interface DockerTag {
  name: string;
  full_size: number;
  last_updated: string;
  architecture: string;
  digest: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const repo = searchParams.get('repo'); // For getting tags
    
    if (!query && !repo) {
      return NextResponse.json({ error: 'Query or repo parameter required' }, { status: 400 });
    }

    // If requesting tags for a specific repository
    if (repo) {
      try {
        const tagsResponse = await fetch(
          `https://hub.docker.com/v2/repositories/${repo}/tags/?page_size=25`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!tagsResponse.ok) {
          throw new Error('Failed to fetch tags');
        }

        const tagsData = await tagsResponse.json();
        return NextResponse.json({
          tags: tagsData.results?.map((tag: any) => ({
            name: tag.name,
            size: tag.full_size,
            lastUpdated: tag.last_updated,
            digest: tag.digest,
          })) || []
        });
      } catch (error) {
        console.error('Error fetching Docker tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
      }
    }

    // Search for repositories
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required for search' }, { status: 400 });
    }

    try {
      // Try the Docker Hub search API
      const searchUrl = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=15`;
      console.log('Searching Docker Hub with URL:', searchUrl);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!searchResponse.ok) {
        console.error('Docker Hub API error:', searchResponse.status, searchResponse.statusText);
        throw new Error('Failed to search Docker Hub');
      }

      const searchData: DockerHubSearchResponse = await searchResponse.json();
      console.log('Docker Hub raw response:', JSON.stringify(searchData, null, 2));
      
      // Log first result to understand the structure
      if (searchData.results && searchData.results.length > 0) {
        console.log('First result structure:', Object.keys(searchData.results[0]));
        console.log('First result:', searchData.results[0]);
      }
      
      // Transform the data to our format
      const transformedResults = searchData.results.map((image, index) => {
        console.log(`Processing image ${index}:`, image);
        
        // Handle different possible field names for image name
        const imageName = image.name || image.repo_name || `unknown-${index}`;
        
        // Handle different possible field names for description
        const imageDescription = image.description || image.short_description || 'No description available';
        
        // Handle different possible field names for owner
        const imageOwner = image.repo_owner || image.user || null;
        
        return {
          name: imageName,
          description: imageDescription,
          stars: image.star_count || 0,
          official: image.is_official || false,
          automated: image.is_automated || false,
          owner: imageOwner,
        };
      });

      console.log('Transformed results:', transformedResults);

      return NextResponse.json({
        count: searchData.count,
        results: transformedResults
      });

    } catch (error) {
      console.error('Error searching Docker Hub:', error);
      return NextResponse.json({ error: 'Failed to search Docker Hub' }, { status: 500 });
    }

  } catch (error) {
    console.error('Docker API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
