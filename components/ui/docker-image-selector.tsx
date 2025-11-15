'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  ChevronDownIcon, 
  TagIcon, 
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  CpuChipIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface DockerImage {
  name: string;
  description: string;
  stars: number;
  official: boolean;
  automated?: boolean;
  owner?: string;
}

interface DockerTag {
  name: string;
  size: number;
  lastUpdated: string;
  digest: string;
}

interface DockerImageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean; // New prop for modal-friendly compact mode
}

export default function DockerImageSelector({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Search Docker images (e.g., nginx, postgres, hello-world)",
  compact = false
}: DockerImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DockerImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DockerImage | null>(null);
  const [tags, setTags] = useState<DockerTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Popular/common Docker images as fallback
  const popularImages: DockerImage[] = [
    { name: 'hello-world', description: 'Simple test container', stars: 1500, official: true },
    { name: 'nginx', description: 'Official Nginx web server', stars: 15000, official: true },
    { name: 'postgres', description: 'Official PostgreSQL database', stars: 8000, official: true },
    { name: 'redis', description: 'Official Redis in-memory store', stars: 10000, official: true },
    { name: 'node', description: 'Official Node.js runtime', stars: 12000, official: true },
    { name: 'python', description: 'Official Python runtime', stars: 7000, official: true },
    { name: 'alpine', description: 'Minimal Linux distribution', stars: 6000, official: true },
    { name: 'ubuntu', description: 'Official Ubuntu base image', stars: 14000, official: true },
  ];

  // Search Docker Hub
  const searchDockerHub = useCallback(async (query: string): Promise<DockerImage[]> => {
    // For short queries, filter popular images locally
    if (query.length < 3) {
      const filtered = popularImages.filter(img => 
        img.name.toLowerCase().includes(query.toLowerCase()) ||
        img.description.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Short query, using popular images:', filtered);
      return filtered.length > 0 ? filtered : popularImages;
    }

    try {
      setIsLoading(true);
      console.log('Searching Docker Hub for:', query);
      const response = await fetch(`/api/docker/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      // If we got results from the API, use them
      if (data.results && data.results.length > 0) {
        // Filter out results with missing names
        const validResults = data.results.filter((result: DockerImage) => result.name && result.name !== 'unknown');
        
        if (validResults.length > 0) {
          return validResults;
        }
      }
      
      // If no results from API, fall back to filtering popular images
      const fallbackResults = popularImages.filter(img => 
        img.name.toLowerCase().includes(query.toLowerCase()) ||
        img.description.toLowerCase().includes(query.toLowerCase())
      );
      console.log('No API results, using fallback:', fallbackResults);
      return fallbackResults;
    } catch (error) {
      console.error('Docker search error:', error);
      // Fallback to filtering popular images
      const fallbackResults = popularImages.filter(img => 
        img.name.toLowerCase().includes(query.toLowerCase()) ||
        img.description.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Error occurred, using fallback:', fallbackResults);
      return fallbackResults;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tags for an image
  const fetchTags = useCallback(async (imageName: string): Promise<DockerTag[]> => {
    try {
      setIsLoadingTags(true);
      const response = await fetch(`/api/docker/search?repo=${encodeURIComponent(imageName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    } finally {
      setIsLoadingTags(false);
    }
  }, []);

  // Handle search input changes with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      console.log('Search effect triggered for query:', searchQuery);
      if (searchQuery.length === 0) {
        console.log('Empty query, showing popular images');
        setSuggestions(popularImages);
      } else {
        console.log('Searching for:', searchQuery);
        searchDockerHub(searchQuery).then((results) => {
          console.log('Setting suggestions:', results);
          setSuggestions(results);
        });
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchDockerHub]);

  // Initialize with popular images
  useEffect(() => {
    setSuggestions(popularImages);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = async (image: DockerImage) => {
    setSelectedImage(image);
    setSearchQuery(image.name);
    
    // For official images with common tags, show tag selector
    if (image.official && ['nginx', 'postgres', 'redis', 'node', 'python', 'ubuntu'].includes(image.name)) {
      const imageTags = await fetchTags(image.name);
      setTags(imageTags);
      setShowTags(true);
    } else {
      onChange(image.name);
      setIsOpen(false);
    }
  };

  const handleTagSelect = (tag: string) => {
    if (selectedImage) {
      const imageWithTag = `${selectedImage.name}:${tag}`;
      onChange(imageWithTag);
      setShowTags(false);
      setIsOpen(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDockerHubUrl = (image: DockerImage): string => {
    // Official images use /_/imageName
    if (image.official) {
      return `https://hub.docker.com/_/${image.name}`;
    }
    // User/organization images use /r/owner/imageName
    if (image.owner) {
      return `https://hub.docker.com/r/${image.owner}/${image.name.split('/').pop()}`;
    }
    // Fallback for images with slash in name (owner/repo format)
    if (image.name.includes('/')) {
      return `https://hub.docker.com/r/${image.name}`;
    }
    // Default fallback
    return `https://hub.docker.com/_/${image.name}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={value || searchQuery}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="form-input w-full pl-16 pr-10"
          placeholder={placeholder}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <img 
            src="/images/providers/docker-mark-blue.svg" 
            alt="Docker" 
            className="w-6 h-6"
          />
          <MagnifyingGlassIcon className="w-3 h-3 text-gray-400" />
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
          disabled={disabled}
        >
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400 mx-auto mb-2"></div>
              <span className="text-sm">Searching Docker Hub...</span>
            </div>
          ) : (
            <>
              {searchQuery.length <= 2 && (
                <div className="p-2 text-xs text-gray-500 border-b border-gray-700 bg-gray-750">
                  Popular Images
                </div>
              )}
              {suggestions.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <span className="text-sm">No images found</span>
                </div>
              ) : (
                suggestions.map((image) => (
                  <div
                    key={image.name}
                    className="w-full text-left hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-b-0 group"
                  >
                    <div className="flex items-start justify-between p-4">
                      <button
                        onClick={() => handleImageSelect(image)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{image.name}</span>
                          {image.official && (
                            <CheckCircleIcon className="w-4 h-4 text-green-400" title="Official Image" />
                          )}
                          {image.automated && (
                            <CpuChipIcon className="w-4 h-4 text-blue-400" title="Automated Build" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mb-1">{image.description}</p>
                        {image.owner && (
                          <p className="text-xs text-gray-500">by {image.owner}</p>
                        )}
                      </button>
                      <div className="flex items-center gap-2 ml-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <StarIcon className="w-3 h-3" />
                          <span>{image.stars.toLocaleString()}</span>
                        </div>
                        <a
                          href={getDockerHubUrl(image)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-500 hover:text-indigo-400 transition-colors rounded hover:bg-gray-600/50"
                          title="View on Docker Hub"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* Tag Selector Modal */}
      {showTags && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-2xl mx-4 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">Select Tag for {selectedImage.name}</h3>
              </div>
              <a
                href={getDockerHubUrl(selectedImage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-indigo-400 border border-gray-600 hover:border-indigo-500 rounded transition-colors"
                title="View on Docker Hub"
              >
                <span>View on Docker Hub</span>
                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </a>
            </div>
            
            {isLoadingTags ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mx-auto mb-2"></div>
                <span className="text-gray-400">Loading tags...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {tags.slice(0, 20).map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => handleTagSelect(tag.name)}
                    className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-white">{tag.name}</span>
                        {tag.name === 'latest' && (
                          <span className="ml-2 text-xs text-orange-400">(not recommended)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{formatBytes(tag.size)}</span>
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatDate(tag.lastUpdated)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onChange(selectedImage.name);
                  setShowTags(false);
                  setIsOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
              >
                Use without tag
              </button>
              <button
                onClick={() => setShowTags(false)}
                className="px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
