import React from 'react';
import { MainPanelLayout } from '../Layout/MainPanelLayout';
import { SearchPanel } from './SearchPanel';
import { SearchResults } from './SearchResults';
import { useSearch } from './useSearch';

const SearchView: React.FC = () => {
  const searchState = useSearch();

  return (
    <MainPanelLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-background-default px-8 pb-4 pt-16">
          <h1 className="text-4xl font-light mb-2">Search</h1>
          <p className="text-sm text-text-muted mb-4">
            Find and replace across your project
          </p>
        </div>

        {/* Search Panel */}
        <div className="px-8 pb-4">
          <SearchPanel
            {...searchState}
            totalMatches={searchState.totalMatches}
            totalFiles={searchState.totalFiles}
            results={searchState.results}
          />
        </div>

        {/* Search Results */}
        <div className="flex-1 min-h-0 px-8 pb-8">
          <SearchResults {...searchState} />
        </div>
      </div>
    </MainPanelLayout>
  );
};

export default SearchView;
