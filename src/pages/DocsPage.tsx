import React, { useState, useMemo } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Search, BookOpen, Rocket, Sparkles, Server, Settings, Wrench, ExternalLink, ChevronDown, ChevronRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import markdown files
import introDoc from '../../docs/introduction.md?raw';
import gettingStartedDoc from '../../docs/getting-started.md?raw';
import issueManagementDoc from '../../docs/features/issue-management.md?raw';
import codeWritingDoc from '../../docs/features/code-writing.md?raw';
import prVerificationDoc from '../../docs/features/pr-verification.md?raw';
import semanticVersioningDoc from '../../docs/features/semantic-versioning.md?raw';
import ciCdDoc from '../../docs/features/ci-cd.md?raw';
import apiReferenceDoc from '../../docs/api-reference.md?raw';
import configDoc from '../../docs/configuration.md?raw';
import troubleshootingDoc from '../../docs/troubleshooting.md?raw';

type DocItem = {
  id: string;
  title: string;
  content: string;
  githubPath: string;
};

type DocCategory = {
  id: string;
  title: string;
  icon: any;
  items: DocItem[];
};

const DOCS_DATA: DocCategory[] = [
  {
    id: 'intro',
    title: 'Introduction',
    icon: BookOpen,
    items: [
      { id: 'introduction', title: 'What is ContriBot?', content: introDoc, githubPath: 'docs/introduction.md' }
    ]
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { id: 'setup', title: 'Setup Guide', content: gettingStartedDoc, githubPath: 'docs/getting-started.md' }
    ]
  },
  {
    id: 'features',
    title: 'Features',
    icon: Sparkles,
    items: [
      { id: 'issue-management', title: 'Issue Management', content: issueManagementDoc, githubPath: 'docs/features/issue-management.md' },
      { id: 'code-writing', title: 'Code Writing', content: codeWritingDoc, githubPath: 'docs/features/code-writing.md' },
      { id: 'pr-verification', title: 'PR Verification', content: prVerificationDoc, githubPath: 'docs/features/pr-verification.md' },
      { id: 'semantic-versioning', title: 'Semantic Versioning', content: semanticVersioningDoc, githubPath: 'docs/features/semantic-versioning.md' },
      { id: 'ci-cd', title: 'CI/CD Integration', content: ciCdDoc, githubPath: 'docs/features/ci-cd.md' }
    ]
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: Server,
    items: [
      { id: 'api-reference', title: 'Endpoints & Formats', content: apiReferenceDoc, githubPath: 'docs/api-reference.md' }
    ]
  },
  {
    id: 'config',
    title: 'Configuration',
    icon: Settings,
    items: [
      { id: 'configuration', title: 'Settings & Env Vars', content: configDoc, githubPath: 'docs/configuration.md' }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Wrench,
    items: [
      { id: 'common-issues', title: 'Common Issues', content: troubleshootingDoc, githubPath: 'docs/troubleshooting.md' }
    ]
  }
];

export const DocsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDocId, setActiveDocId] = useState<string>('introduction');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'features': true,
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const filteredDocs = useMemo((): DocCategory[] => {
    if (!searchQuery.trim()) return DOCS_DATA;
    
    const query = searchQuery.toLowerCase();
    return DOCS_DATA.map(category => {
      const filteredItems = category.items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.content.toLowerCase().includes(query)
      );
      return { ...category, items: filteredItems };
    }).filter(category => category.items.length > 0);
  }, [searchQuery]);

  const activeDoc = useMemo(() => {
    for (const category of DOCS_DATA) {
      const found = category.items.find(item => item.id === activeDocId);
      if (found) return found;
    }
    return DOCS_DATA[0].items[0];
  }, [activeDocId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 bg-gray-950 text-gray-200">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filteredDocs.map((category) => (
            <div key={category.id} className="space-y-1">
              {category.items.length > 1 ? (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <category.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{category.title}</span>
                  {expandedCategories[category.id] || searchQuery ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-gray-400">
                  <category.icon className="w-4 h-4" />
                  <span>{category.title}</span>
                </div>
              )}

              <AnimatePresence initial={false}>
                {(expandedCategories[category.id] || searchQuery || category.items.length === 1) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col space-y-0.5 mt-1">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveDocId(item.id)}
                          className={`text-left px-3 py-1.5 ml-4 text-sm rounded-md transition-colors ${
                            activeDocId === item.id
                              ? 'bg-green-500/10 text-green-400 font-medium'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-950">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="flex justify-end mb-8">
            <a
              href={`https://github.com/your-username/contribot/edit/main/${activeDoc.githubPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Github className="w-4 h-4" />
              Edit this page on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="prose prose-invert prose-green max-w-none">
            <MarkdownPreview 
              source={activeDoc.content} 
              style={{ backgroundColor: 'transparent', color: 'inherit' }}
              wrapperElement={{
                "data-color-mode": "dark"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
