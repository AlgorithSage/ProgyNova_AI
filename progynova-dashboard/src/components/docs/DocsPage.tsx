import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import userGuideMd from '../../../../docs/user_guide.md?raw';
import './DocsPage.css';

export function DocsPage() {
  return (
    <div className="docs-page">
      <div className="docs-page__content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {userGuideMd}
        </ReactMarkdown>
      </div>
    </div>
  );
}
