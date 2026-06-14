import React, { useState, useEffect, useRef } from 'react';
import { Globe, HelpCircle, ArrowRight, Loader2, CheckCircle2, ChevronRight, RefreshCw, X, Sparkles, BookOpen, Layers, Network, ChevronDown, ChevronUp, Folder, FolderOpen } from 'lucide-react';
import { fetchWikiPage, parseWikiUrl, WikiPageData, WikiMenuItem, validateTitlesExist, fetchAllWikiPages, fetchWikiTitleCategoryBuckets, META_FILTERS, filterOutMeta } from '../utils/wikiCrawler';
import { categorizeTitlesAI, WikiBucketKey } from '../services/openai';
import { heuristicBucket, reconcileSubpages } from '../utils/titleBucket';
import { OpenAISettings } from '../types';
import { Button } from './ui/Button';

// Tên hiển thị 5 nhóm (khớp generateAutoCategorizedTree để đồng nhất UI)
const BUCKET_TITLES: Record<WikiBucketKey, string> = {
  worldview: 'THẾ GIỚI QUAN',
  systems: 'HỆ THỐNG (Sức mạnh, Kinh tế...), CƠ CHẾ, QUY TẮC',
  characters: 'NHÂN VẬT',
  locations: 'KHU VỰC',
  timeline: 'DÒNG THỜI GIAN'
};
const BUCKET_ORDER: WikiBucketKey[] = ['worldview', 'systems', 'characters', 'locations', 'timeline'];

// Dựng cây 5 nhóm từ kết quả phân loại bằng AI (model phụ).
function buildTreeFromCategories(
  links: string[],
  mapping: Record<string, WikiBucketKey>,
  domain: string
): WikiMenuItem[] {
  const buckets: Record<WikiBucketKey, WikiMenuItem[]> = {
    worldview: [], systems: [], characters: [], locations: [], timeline: []
  };
  const repairedMapping: Record<string, WikiBucketKey> = {};

  links.forEach(linkText => {
    const aiBucket = mapping[linkText];
    const fallbackBucket = heuristicBucket(linkText);
    repairedMapping[linkText] = BUCKET_ORDER.includes(aiBucket)
      ? aiBucket
      : fallbackBucket;

    if (repairedMapping[linkText] === 'worldview' && fallbackBucket === 'characters') {
      repairedMapping[linkText] = 'characters';
    }
  });

  const finalMapping = reconcileSubpages(repairedMapping);

  links.forEach(linkText => {
    const url = `https://${domain}/wiki/${encodeURIComponent(linkText.replace(/ /g, '_'))}`;
    const key = finalMapping[linkText] || heuristicBucket(linkText);
    (buckets[key] || buckets.worldview).push({ title: linkText, url, isLink: true });
  });
  return BUCKET_ORDER.map(key => ({
    title: BUCKET_TITLES[key],
    isLink: false,
    children: buckets[key]
  }));
}

interface WikiCollectorProps {
  onApplyWikiData: (title: string, content: string, url: string) => void;
  className?: string;
  isChatLoading: boolean;
  settings: OpenAISettings;
}

interface CrawlTask {
  title: string;
  url: string;
  status: 'idle' | 'fetching' | 'success' | 'failed';
  data?: WikiPageData;
}

interface WikiTreeNode {
  title: string;
  url?: string;
  isLink?: boolean;
  selected: boolean;
  expanded?: boolean;
  children?: WikiTreeNode[];
}

// Recursive Tree Node Renderer
interface WikiTreeNodeViewProps {
  node: WikiTreeNode;
  onToggleSelect: (title: string, url?: string) => void;
  onToggleExpand: (title: string, url?: string) => void;
  depth: number;
}

const WikiTreeNodeView: React.FC<WikiTreeNodeViewProps> = ({
  node,
  onToggleSelect,
  onToggleExpand,
  depth
}) => {
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className="font-sans text-xs select-none">
      {/* Node display row */}
      <div 
        className="flex items-center gap-2 py-1.5 hover:bg-slate-800/60 rounded px-1.5 transition-all outline-none"
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        {/* Toggle Expand icon for directories */}
        {hasChildren ? (
          <button 
            type="button"
            onClick={() => onToggleExpand(node.title, node.url)}
            className="p-0.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded focus:outline-none transition-colors"
          >
            <ChevronRight 
              size={12} 
              className={`transform transition-transform duration-150 ${node.expanded ? 'rotate-90 text-indigo-400' : ''}`} 
            />
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" /> // Spacer for alignment
        )}

        {/* Custom style Checkbox */}
        <input 
          type="checkbox"
          checked={node.selected}
          onChange={() => onToggleSelect(node.title, node.url)}
          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-indigo-500"
        />

        {/* Node Label representing type (folder vs page) */}
        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
          {hasChildren ? (
            node.expanded ? (
              <FolderOpen size={13} className="text-amber-400 shrink-0" />
            ) : (
              <Folder size={13} className="text-amber-500/95 shrink-0" />
            )
          ) : (
            <BookOpen size={12} className="text-emerald-400 shrink-0" />
          )}
          
          <span 
            className={`truncate cursor-pointer hover:underline text-[11px] font-sans ${hasChildren ? 'font-medium text-slate-200' : 'text-slate-300'} ${!node.selected ? 'opacity-40' : ''}`}
            onClick={() => {
              if (hasChildren) {
                onToggleExpand(node.title, node.url);
              } else {
                onToggleSelect(node.title, node.url);
              }
            }}
            title={node.title}
          >
            {node.title}
          </span>
        </div>
      </div>

      {/* Render children recursively if expanded */}
      {hasChildren && node.expanded && (
        <div className="border-l border-slate-800/60 ml-3.5 pl-1.5 animate-in fade-in slide-in-from-left-1 duration-100">
          {node.children!.map((child, idx) => (
            <WikiTreeNodeView 
              key={`${child.title}-${idx}`}
              node={child}
              onToggleSelect={onToggleSelect}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const WikiCollector: React.FC<WikiCollectorProps> = ({
  onApplyWikiData,
  className = '',
  isChatLoading,
  settings
}) => {
  const [wikiUrl, setWikiUrl] = useState('');
  const [harvestAll, setHarvestAll] = useState(true); // Thu hoạch TOÀN BỘ trang của wiki
  // Các loại META user chọn GIỮ LẠI (tick). Mặc định [] = loại bỏ tất cả.
  const [keptMeta, setKeptMeta] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sillyLore_wiki_keptMeta');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showMetaFilters, setShowMetaFilters] = useState(false);
  useEffect(() => {
    localStorage.setItem('sillyLore_wiki_keptMeta', JSON.stringify(keptMeta));
  }, [keptMeta]);
  const toggleKeptMeta = (key: string) => {
    setKeptMeta(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const [isCrawling, setIsCrawling] = useState(false);
  const [step, setStep] = useState<'idle' | 'analyzed' | 'crawling' | 'completed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewType, setViewType] = useState<'tree' | 'flat'>('tree');
  
  // Persist collapsible state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sillyLore_wiki_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sillyLore_wiki_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Draggable sphere position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('sillyLore_wiki_position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return { x: window.innerWidth - 100, y: window.innerHeight - 200 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const positionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { x: position.x, y: position.y };
    hasMovedRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    positionStartRef.current = { x: position.x, y: position.y };
    hasMovedRef.current = false;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      const newX = Math.max(10, Math.min(window.innerWidth - 70, positionStartRef.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 70, positionStartRef.current.y + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      const newX = Math.max(10, Math.min(window.innerWidth - 70, positionStartRef.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 70, positionStartRef.current.y + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      localStorage.setItem('sillyLore_wiki_position', JSON.stringify(position));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, position]);

  // Main page data
  const [mainPage, setMainPage] = useState<WikiPageData | null>(null);

  // Sub-pages/links to selection (Flat View)
  const [subPages, setSubPages] = useState<{ title: string; selected: boolean }[]>([]);

  // Menu Tree State (Hierarchical flyout/nested menus)
  const [menuTreeState, setMenuTreeState] = useState<WikiTreeNode[]>([]);

  // Batch crawling status
  const [crawlTasks, setCrawlTasks] = useState<CrawlTask[]>([]);
  const [aggregateResult, setAggregateResult] = useState<{ totalLength: number; text: string } | null>(null);

  // Recursive mapper: WikiMenuItem -> WikiTreeNode
  const mapToTreeNodes = (items: WikiMenuItem[]): WikiTreeNode[] => {
    return items.map(item => ({
      title: item.title,
      url: item.url,
      isLink: item.isLink,
      selected: true,
      expanded: true, // Auto-expand level-1 groupings
      children: item.children ? mapToTreeNodes(item.children) : undefined
    }));
  };

  const handleSuggestionClick = (url: string) => {
    setWikiUrl(url);
    setErrorMsg('');
  };

  const handleReset = () => {
    setWikiUrl('');
    setStep('idle');
    setMainPage(null);
    setSubPages([]);
    setMenuTreeState([]);
    setCrawlTasks([]);
    setAggregateResult(null);
    setErrorMsg('');
  };

  const handleAnalyze = async () => {
    if (!wikiUrl.trim()) return;
    setIsCrawling(true);
    setErrorMsg('');
    setMainPage(null);
    setSubPages([]);
    setMenuTreeState([]);

    try {
      // Parse individual URLs
      let urls = wikiUrl
        .split(/[\n,;]+/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

      // Sửa tiền tố giao thức nếu thiếu mà trông giống domain
      urls = urls.map(u => {
        if (!u.startsWith('http://') && !u.startsWith('https://') && (u.includes('.com') || u.includes('.org') || u.includes('.net') || u.includes('.wiki'))) {
          return 'https://' + u;
        }
        return u;
      }).filter(u => u.startsWith('http://') || u.startsWith('https://'));

      if (urls.length === 0) {
        throw new Error("Không tìm thấy đường dẫn Wiki hợp lệ. Vui lòng nhập đường dẫn đầy đủ dạng https://...");
      }

      const limitUrls = urls.slice(0, 15); // limit to 15 concurrent main crawls for performance and safety
      
      const fetchPromises = limitUrls.map(async (url) => {
        try {
          const data = await fetchWikiPage(url);
          return { success: true, data };
        } catch (err: any) {
          console.warn(`Thất bại khi phân tích ${url}:`, err);
          return { success: false, error: err.message || String(err) };
        }
      });

      const finished = await Promise.all(fetchPromises);
      const successPages = finished.filter(f => f.success && f.data).map(f => f.data!) as WikiPageData[];
      const failedPages = finished.filter(f => !f.success);

      if (successPages.length === 0) {
        throw new Error(failedPages[0]?.error || "Tất cả các liên kết Wiki được cung cấp đều thu thập thất bại.");
      }

      // Merge multiple pages' data
      const primaryPage = successPages[0];
      const parsedBase = parseWikiUrl(primaryPage.url);
      const domain = parsedBase.domain || "fandom.com";

      // Consolidated main page
      const title = successPages.length === 1
        ? primaryPage.title
        : `Tổng hợp bối cảnh: ${primaryPage.title} (+ ${successPages.length - 1} trang bối cảnh khác)`;
      
      const combinedContent = successPages.length === 1
        ? primaryPage.content
        : successPages.map(p => `=== BỐI CẢNH CHÍNH: ${p.title} ===\n${p.content}`).join('\n\n');

      // Union of all related links across all pages
      let consolidatedLinks = Array.from(new Set(successPages.flatMap(p => p.links)));

      // ─── THU HOẠCH TOÀN BỘ WIKI ───
      // Crawl 1 trang chỉ thấy link TRÊN trang đó (vài chục). Để lấy ĐỦ mọi bài
      // (vd 133 page), hỏi thẳng MediaWiki list=allpages rồi gộp vào.
      if (harvestAll && parsedBase.isMediaWiki && domain) {
        try {
          const allPages = await fetchAllWikiPages(domain);
          if (allPages.length > 0) {
            consolidatedLinks = Array.from(new Set([...consolidatedLinks, ...allPages]));
          }
        } catch (e) {
          console.warn('Liệt kê toàn bộ wiki thất bại, dùng link trên trang:', e);
        }
      }

      // ─── LỌC MỤC NGOÀI CỐT TRUYỆN (META) theo pick-list của user ───
      // excludeKeys = mọi loại META trừ những loại user tick "giữ lại".
      {
        const excludeKeys = META_FILTERS.map(c => c.key).filter(k => !keptMeta.includes(k));
        const { kept, removed } = filterOutMeta(consolidatedLinks, excludeKeys);
        if (removed.length > 0 && kept.length > 0) {
          consolidatedLinks = kept;
          setErrorMsg(`Đã loại ${removed.length} mục ngoài cốt truyện (tác giả/seiyuu/OST/fanart...). Còn ${kept.length} mục.`);
        }
      }

      // ─── TIỀN KIỂM TRA LINK CHẾT (nhanh, gộp 50 tiêu đề/1 request) ───
      // Lọc bỏ trang không tồn tại NGAY ở bước này → crawl không phí thời gian
      // retry link chết, và báo "dead" chính xác sớm.
      try {
        const existing = await validateTitlesExist(consolidatedLinks, domain);
        if (existing.size > 0) {
          const before = consolidatedLinks.length;
          const filtered = consolidatedLinks.filter(l => existing.has(l));
          if (filtered.length > 0) {
            const dead = before - filtered.length;
            consolidatedLinks = filtered;
            if (dead > 0) {
              setErrorMsg(`Đã lọc bỏ ${dead}/${before} link không tồn tại (kiểm tra trước). Còn ${filtered.length} link sống.`);
            }
          }
        }
      } catch (e) {
        console.warn('Tiền kiểm tra link thất bại, bỏ qua bước lọc:', e);
      }

      // ─── PHÂN LOẠI 5 NHÓM ───
      // Ưu tiên dùng Model PHỤ (Flash) phân loại theo NGỮ NGHĨA (chính xác cho
      // mọi wiki). Nếu tắt model phụ hoặc lỗi → fallback về keyword (cũ).
      let categoryMapping: Record<string, WikiBucketKey> = {};
      try {
        categoryMapping = await fetchWikiTitleCategoryBuckets(consolidatedLinks, domain);
      } catch (e) {
        console.warn('Phân loại bằng category wiki thất bại, bỏ qua:', e);
      }

      let mergedMenuTree: WikiMenuItem[];
      if (settings?.enableSecondaryModel && settings?.apiKey && consolidatedLinks.length > 0) {
        try {
          const mapping = await categorizeTitlesAI(consolidatedLinks, settings);
          mergedMenuTree = buildTreeFromCategories(consolidatedLinks, { ...mapping, ...categoryMapping }, domain);
        } catch (e) {
          console.warn('Phân loại bằng AI thất bại, dùng keyword:', e);
          mergedMenuTree = buildTreeFromCategories(consolidatedLinks, categoryMapping, domain);
        }
      } else {
        mergedMenuTree = buildTreeFromCategories(consolidatedLinks, categoryMapping, domain);
      }

      const mergedPage: WikiPageData = {
        title,
        url: primaryPage.url, // primary URL, or we can list all of them
        content: combinedContent,
        links: consolidatedLinks,
        menuTree: mergedMenuTree
      };

      setMainPage(mergedPage);

      // Flat links fallback (first 1500 options across all pages)
      const formattedSubPages = consolidatedLinks
        .slice(0, 1500)
        .map(link => ({ title: link, selected: true }));
      setSubPages(formattedSubPages);

      // Hierarchical Menu Tree setup
      if (mergedPage.menuTree && mergedPage.menuTree.length > 0) {
        setMenuTreeState(mapToTreeNodes(mergedPage.menuTree));
        setViewType('tree');
      } else {
        setMenuTreeState([]);
        setViewType('flat'); // Fallback to flat view if no menus found
      }

      setStep('analyzed');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Thu thập thất bại (Phân tích): ${err.message || "Vui lòng kiểm tra lại đường dẫn."}`);
    } finally {
      setIsCrawling(false);
    }
  };

  // --- Recursive tree state management handlers ---

  const handleTreeToggleSelect = (title: string, url?: string) => {
    const update = (nodes: WikiTreeNode[]): WikiTreeNode[] => {
      return nodes.map(node => {
        if (node.title === title && node.url === url) {
          const nextSelected = !node.selected;
          const selectAllChildren = (childNode: WikiTreeNode, isSel: boolean): WikiTreeNode => ({
            ...childNode,
            selected: isSel,
            children: childNode.children 
              ? childNode.children.map(c => selectAllChildren(c, isSel)) 
              : undefined
          });
          return selectAllChildren(node, nextSelected);
        }
        
        if (node.children) {
          return {
            ...node,
            children: update(node.children)
          };
        }
        return node;
      });
    };
    setMenuTreeState(prev => update(prev));
  };

  const handleTreeToggleExpand = (title: string, url?: string) => {
    const update = (nodes: WikiTreeNode[]): WikiTreeNode[] => {
      return nodes.map(node => {
        if (node.title === title && node.url === url) {
          return {
            ...node,
            expanded: !node.expanded
          };
        }
        if (node.children) {
          return {
            ...node,
            children: update(node.children)
          };
        }
        return node;
      });
    };
    setMenuTreeState(prev => update(prev));
  };

  const handleTreeSelectAllStatus = (select: boolean) => {
    const selectAll = (nodes: WikiTreeNode[]): WikiTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        selected: select,
        children: node.children ? selectAll(node.children) : undefined
      }));
    };
    setMenuTreeState(prev => selectAll(prev));
  };

  // Extract selected Leaf URLs from the recursive tree
  const getSelectedLeafNodesRecursive = (nodes: WikiTreeNode[]): { title: string; url: string }[] => {
    let result: { title: string; url: string }[] = [];
    const traverse = (list: WikiTreeNode[]) => {
      list.forEach(node => {
        if (node.selected && node.isLink && node.url) {
          result.push({ title: node.title, url: node.url });
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return result;
  };

  // Count total selected pages in state
  const getSelectedCounts = () => {
    if (viewType === 'tree' && menuTreeState.length > 0) {
      const selected = getSelectedLeafNodesRecursive(menuTreeState);
      return selected.length;
    } else {
      return subPages.filter(p => p.selected).length;
    }
  };

  // Flat select all
  const handleFlatSelectAll = (select: boolean) => {
    setSubPages(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleStartCrawling = async () => {
    if (!mainPage) return;
    setStep('crawling');
    setIsCrawling(true);

    const urls = wikiUrl
      .split(/[\n,;]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);
    const cleanUrls = urls.map(u => {
      if (!u.startsWith('http://') && !u.startsWith('https://') && (u.includes('.com') || u.includes('.org') || u.includes('.net') || u.includes('.wiki'))) {
        return 'https://' + u;
      }
      return u;
    }).filter(u => u.startsWith('http://') || u.startsWith('https://'));
    const primaryUrl = cleanUrls[0] || wikiUrl.trim();
    const parsedBase = parseWikiUrl(primaryUrl);
    
    let selectedTargets: { title: string; url: string }[] = [];

    if (viewType === 'tree' && menuTreeState.length > 0) {
      selectedTargets = getSelectedLeafNodesRecursive(menuTreeState);
    } else {
      const selectedSubPages = subPages.filter(p => p.selected);
      selectedTargets = selectedSubPages.map(sp => {
        const subUrl = parsedBase.isMediaWiki
          ? `https://${parsedBase.domain}/wiki/${encodeURIComponent(sp.title.replace(/ /g, '_'))}`
          : primaryUrl;
        return {
          title: sp.title,
          url: subUrl
        };
      });
    }

    // Deduplicate selected targets by URL to avoid redundant calls
    selectedTargets = selectedTargets.filter(
      (value, index, self) => self.findIndex(t => t.url === value.url) === index
    );

    if (selectedTargets.length === 0) {
      setErrorMsg("Vui lòng lựa chọn ít nhất một mục liên kết bối cảnh để thu thập.");
      setStep('analyzed');
      setIsCrawling(false);
      return;
    }

    // Safety limit raised significantly supporting up to 1500 deep nodes
    const SAFETY_CAP = 1500;
    if (selectedTargets.length > SAFETY_CAP) {
      selectedTargets = selectedTargets.slice(0, SAFETY_CAP);
    }

    const tasks: CrawlTask[] = selectedTargets.map(target => ({
      title: target.title,
      url: target.url,
      status: 'idle'
    }));

    setCrawlTasks(tasks);

    let combinedText = `=== WIKI CHÍNH (Đầu mối): ${mainPage.title} ===\n${mainPage.content}\n\n`;
    
    const updatedTasks = [...tasks];
    // Crawl là HTTP thuần (KHÔNG tốn quota LLM) nên có thể chạy nhiều luồng.
    // Đã tiền lọc link chết nên hiếm khi đụng rate-limit → nâng song song cho nhanh.
    const CONCURRENCY_PASS1 = 6;
    const CONCURRENCY_PASS2 = 3;

    // Helper to process a single task index with ROBUST retry logic + exponential backoff
    const processTask = async (index: number, maxRetries: number = 5, baseDelay: number = 500) => {
      if (index >= updatedTasks.length) return;
      updatedTasks[index].status = 'fetching';
      setCrawlTasks([...updatedTasks]);

      let retries = maxRetries;
      let success = false;
      let subData: any = null;
      let lastError: any = null;
      let attemptCount = 0;

      while (retries >= 0 && !success) {
        attemptCount++;
        try {
          subData = await fetchWikiPage(updatedTasks[index].url, { skipMenu: true });
          success = true;
        } catch (err: any) {
          lastError = err;
          
          // Kiểm tra lỗi vĩnh viễn (trang không tồn tại) để không mất thời gian retry
          const errMsg = String(err.message || err).toLowerCase();
          if (
            errMsg.includes('không tồn tại') || 
            errMsg.includes('missingtitle') || 
            errMsg.includes('notfound') || 
            errMsg.includes('invalidtitle') ||
            errMsg.includes('404')
          ) {
            console.warn(`[Wiki Collector] Phát hiện trang không tồn tại, bỏ qua retry: ${updatedTasks[index].title}`);
            retries = -1;
            break;
          }

          retries--;
          if (retries >= 0) {
            // Exponential backoff: 500ms, 1s, 2s, 4s, 8s...
            const delay = baseDelay * Math.pow(2, attemptCount - 1);
            const jitter = Math.random() * 300; // Random jitter để tránh thundering herd
            await new Promise(resolve => setTimeout(resolve, Math.min(delay + jitter, 15000)));
          }
        }
      }

      if (success && subData) {
        updatedTasks[index].status = 'success';
        updatedTasks[index].data = subData;
      } else {
        console.warn(`[Pass] Thất bại sau ${attemptCount} lần thử: ${updatedTasks[index].title}`, lastError);
        updatedTasks[index].status = 'failed';
      }
      setCrawlTasks([...updatedTasks]);
    };

    // ═══════════════════════════════════════════════════════════════
    // PASS 1: Thu thập chính - Concurrency 2, retry 5 lần, backoff 500ms
    // ═══════════════════════════════════════════════════════════════
    for (let i = 0; i < updatedTasks.length; i += CONCURRENCY_PASS1) {
      const chunkPromises: Promise<any>[] = [];
      for (let j = 0; j < CONCURRENCY_PASS1; j++) {
        const targetIdx = i + j;
        if (targetIdx < updatedTasks.length) {
          chunkPromises.push(processTask(targetIdx, 5, 500));
        }
      }
      await Promise.all(chunkPromises);
      // Delay giữa các batch: 500ms để server không bị quá tải
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Đếm kết quả Pass 1
    let failedIndices = updatedTasks.map((t, idx) => t.status === 'failed' ? idx : -1).filter(i => i !== -1);
    const pass1Success = updatedTasks.filter(t => t.status === 'success').length;
    const pass1Total = updatedTasks.length;

    // ═══════════════════════════════════════════════════════════════
    // PASS 2: Tự động retry TẤT CẢ tasks bị lỗi - Tuần tự, retry 5 lần, backoff 1s
    // ═══════════════════════════════════════════════════════════════
    if (failedIndices.length > 0) {
      console.log(`[Wiki Collector] Pass 1 hoàn tất: ${pass1Success}/${pass1Total} thành công. Bắt đầu Pass 2 cho ${failedIndices.length} trang bị lỗi...`);
      
      // Nghỉ 2 giây trước khi bắt đầu Pass 2 để server hồi phục
      await new Promise(resolve => setTimeout(resolve, 2000));

      for (let i = 0; i < failedIndices.length; i += CONCURRENCY_PASS2) {
        const chunkPromises: Promise<any>[] = [];
        for (let j = 0; j < CONCURRENCY_PASS2; j++) {
          const batchIdx = i + j;
          if (batchIdx < failedIndices.length) {
            const taskIdx = failedIndices[batchIdx];
            // Reset trạng thái trước khi retry
            updatedTasks[taskIdx].status = 'idle';
            setCrawlTasks([...updatedTasks]);
            chunkPromises.push(processTask(taskIdx, 5, 1000));
          }
        }
        await Promise.all(chunkPromises);
        // Delay lớn hơn giữa các batch Pass 2: 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Đếm kết quả Pass 2
      failedIndices = updatedTasks.map((t, idx) => t.status === 'failed' ? idx : -1).filter(i => i !== -1);
      const pass2Success = updatedTasks.filter(t => t.status === 'success').length;

      // ═══════════════════════════════════════════════════════════════
      // PASS 3 (Final): Nỗ lực cuối cùng - Tuần tự, retry 3 lần, backoff 2s  
      // ═══════════════════════════════════════════════════════════════
      if (failedIndices.length > 0) {
        console.log(`[Wiki Collector] Pass 2 hoàn tất: ${pass2Success}/${pass1Total} thành công. Pass 3 cuối cùng cho ${failedIndices.length} trang còn lại...`);
        
        // Nghỉ 3 giây trước Pass 3
        await new Promise(resolve => setTimeout(resolve, 3000));

        for (const taskIdx of failedIndices) {
          updatedTasks[taskIdx].status = 'idle';
          setCrawlTasks([...updatedTasks]);
          await processTask(taskIdx, 3, 2000);
          // Delay lớn giữa từng task: 1.5s
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    // Tổng kết cuối cùng
    const finalSuccess = updatedTasks.filter(t => t.status === 'success').length;
    const finalFailed = updatedTasks.filter(t => t.status === 'failed').length;
    console.log(`[Wiki Collector] KẾT QUẢ CUỐI CÙNG: ${finalSuccess}/${pass1Total} thành công, ${finalFailed} thất bại.`);

    // ─── SỬA SỐ ĐẾM TRANG TRÊN TITLE ───
    // Title được tạo lúc phân tích chỉ tính số URL nhập tay (vd 15 → "+14 trang").
    // Nhưng số trang THỰC SỰ gom được (1 trang chính + mọi trang con đã crawl)
    // lớn hơn nhiều (vd 143). Cập nhật lại để khớp con số "Nạp dữ liệu (143 trang)".
    const totalHarvested = finalSuccess + 1; // +1 = trang chính đã gộp
    setMainPage(prev => {
      if (!prev) return prev;
      const baseTitle = prev.title.replace(/\s*\(\+[^)]*\)\s*$/, '');
      const newTitle = totalHarvested > 1
        ? `${baseTitle} (+ ${totalHarvested - 1} trang bối cảnh khác)`
        : baseTitle;
      return { ...prev, title: newTitle };
    });

    // Accumulate all contents properly in order
    for (const task of updatedTasks) {
      if (task.status === 'success' && task.data) {
        combinedText += `=== MỤC BỐI CẢNH PHỤ: ${task.data.title} ===\n${task.data.content}\n\n`;
      } else {
        // Tỷ lệ 1:1: Ghi nhận cả trang lỗi để không bị thiếu hụt số lượng thông tin quét được ban đầu
        combinedText += `=== MỤC BỐI CẢNH PHỤ: ${task.title} ===\n[LỖI: Không thể tự động tải nội dung chi tiết cho trang này từ Wiki. Đường dẫn: ${task.url}]\n\n`;
      }
    }

    setAggregateResult({
      totalLength: combinedText.length,
      text: combinedText
    });
    setStep('completed');
    setIsCrawling(false);
  };

  const handleFeedToTawa = () => {
    if (!aggregateResult || !mainPage) return;
    onApplyWikiData(mainPage.title, aggregateResult.text, mainPage.url);
  };

  if (isCollapsed) {
    return (
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => {
          if (!hasMovedRef.current) {
            setIsCollapsed(false);
          }
        }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
        }}
        className={`w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-indigo-100 transition-all duration-200 relative select-none z-50 group hover:shadow-lg hover:shadow-indigo-500/50 border border-indigo-400/30 shadow-md ${isDragging ? 'scale-105 shadow-xl shadow-indigo-500/60' : ''}`}
        title="Bản Đồ Tri Thức Wiki (Kéo thả di chuyển, chạm để mở)"
      >
        <div className="absolute inset-[-4px] rounded-full border border-indigo-500/20 animate-ping opacity-75 pointer-events-none"></div>
        <div className="absolute inset-[-8px] rounded-full border border-purple-500/10 animate-pulse pointer-events-none"></div>

        <div className="absolute -top-1.5 bg-slate-950 border border-slate-700/80 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-slate-300 pointer-events-none scale-90 whitespace-nowrap shadow uppercase tracking-wide">
          Wiki
        </div>

        <Network size={22} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        
        <span className="absolute bottom-[-24px] scale-0 transition-transform duration-200 group-hover:scale-100 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-0.5 text-[10px] whitespace-nowrap font-medium pointer-events-none shadow-xl z-50">
          Chạm để mở • Kéo để di chuyển
        </span>
      </div>
    );
  }

  const selectedCountNum = getSelectedCounts();

  return (
    <div className={`w-80 shrink-0 h-full bg-slate-900/90 backdrop-blur-md border-r border-slate-700/50 flex flex-col shadow-2xl transition-all duration-300 relative overflow-hidden ${className}`}>
      
      {/* Panel Header */}
      <div className="h-16 border-b border-slate-700 px-4 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/30">
            <Globe size={15} className="text-indigo-400 rotate-12" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-100 tracking-wide uppercase font-mono">Bản Đồ Tri Thức Wiki</h3>
            <p className="text-[10px] text-slate-400 font-sans">Thu thập đa tầng từ Menu rẽ nhánh</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsCollapsed(true)}
          className="text-slate-400 hover:text-indigo-400 p-1.5 hover:bg-slate-800 rounded transition-colors"
          title="Thu gọn"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main content view */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

        {step === 'idle' && (
          <div className="space-y-4 font-sans animate-in fade-in duration-200">
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1 text-xs">
                <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                Cơ chế Bứt Phá Độc Quyền:
              </span>
              Nhập link bài Wiki. Hệ thống sẽ càn quét, mổ xẻ cấu trúc <b>Nested Dropdown/Flyout Navigation Menu (Menu đa nhánh nhiều cấp)</b> để tự động vẽ lại bản đồ danh mục chuyên sâu. Con có thể lựa chọn thu hoạch diện rộng chỉ bằng 1 liên kết gốc duy nhất!
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 font-mono">DANH SÁCH ĐƯỜNG DẪN WIKI SƯU TẦM (CHO PHÉP NHIỀU LINK)</label>
              <div className="flex flex-col gap-2">
                <textarea 
                  placeholder="Nhập một hoặc nhiều đường dẫn Wiki hoặc Fandom cách nhau bởi dấu phẩy hoặc xuống dòng..."
                  value={wikiUrl}
                  onChange={(e) => {
                    setWikiUrl(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  rows={3}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors resize-none"
                />
                
                {errorMsg && (
                  <p className="text-[11px] text-red-400 font-sans font-medium px-1 bg-red-950/20 py-1.5 rounded border border-red-500/20">{errorMsg}</p>
                )}

                <label className="flex items-center gap-2 cursor-pointer px-1 select-none">
                  <input
                    type="checkbox"
                    checked={harvestAll}
                    onChange={(e) => setHarvestAll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-indigo-500"
                  />
                  <span className="text-[11px] text-slate-300 font-sans">
                    Thu hoạch <b className="text-indigo-300">TOÀN BỘ</b> trang của wiki (liệt kê mọi bài, không chỉ link trên trang gốc)
                  </span>
                </label>

                {/* Bộ lọc mục ngoài cốt truyện (META) — pick-list */}
                <div className="bg-slate-950/40 rounded-lg border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowMetaFilters(v => !v)}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-medium text-slate-300 hover:text-slate-100"
                  >
                    <span className="flex items-center gap-1.5">
                      {showMetaFilters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Bộ lọc rác — loại mục ngoài cốt truyện
                      <span className="text-[9px] text-slate-500">(mặc định loại {META_FILTERS.length - keptMeta.length}/{META_FILTERS.length})</span>
                    </span>
                  </button>
                  {showMetaFilters && (
                    <div className="px-2.5 pb-2.5 pt-0.5 space-y-1.5 border-t border-slate-800/80">
                      <p className="text-[9.5px] text-slate-500 italic leading-snug pt-1.5">
                        Mặc định <b>BỎ TICK = loại bỏ</b> khi quét. Tick để <b>GIỮ LẠI</b> loại đó.
                      </p>
                      {META_FILTERS.map(cat => (
                        <label key={cat.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={keptMeta.includes(cat.key)}
                            onChange={() => toggleKeptMeta(cat.key)}
                            className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                          />
                          <span className={`text-[11px] font-sans ${keptMeta.includes(cat.key) ? 'text-emerald-300' : 'text-slate-400 line-through decoration-slate-600'}`}>
                            {cat.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isCrawling || !wikiUrl.trim()}
                  variant="primary"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 mt-1 shadow-lg shadow-indigo-500/20 border-none"
                >
                  {isCrawling ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Phân tích cấu trúc đa tầng...
                    </>
                  ) : (
                    <>
                      Xác nhận & Thu thập nhánh
                      <ArrowRight size={13} />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Suggestions/Demo */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider block">Ví dụ gợi ý bối cảnh</span>
              <div className="space-y-1.5">
                <button 
                  onClick={() => handleSuggestionClick('https://genshin-impact.fandom.com/wiki/Liyue')}
                  className="w-full text-left bg-slate-800/40 hover:bg-indigo-950/20 hover:border-indigo-500/40 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 truncate font-mono block transition-all"
                >
                  Genshin Fandom: Liyue Region
                </button>
                <button 
                  onClick={() => handleSuggestionClick('https://onepiece.fandom.com/wiki/Wano_Country')}
                  className="w-full text-left bg-slate-800/40 hover:bg-indigo-950/20 hover:border-indigo-500/40 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 truncate font-mono block transition-all"
                >
                  One Piece Fandom: Wano Country
                </button>
                <button 
                  onClick={() => handleSuggestionClick('https://lordoftherings.fandom.com/wiki/Harry_Potter_Wiki')}
                  className="w-full text-left bg-slate-800/40 hover:bg-indigo-950/20 hover:border-indigo-500/40 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 truncate font-mono block transition-all"
                >
                  LOTR Fandom: Middle-earth Portal
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzed' && mainPage && (
          <div className="space-y-4 font-sans animate-in fade-in duration-200">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-indigo-500/15">
              <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-indigo-400 block mb-0.5">ỐNG KÍNH WIKI CHÍNH</span>
              <h4 className="text-xs font-bold text-slate-200 truncate">{mainPage.title}</h4>
              <p className="text-[10px] text-slate-500 truncate font-mono mt-1">{mainPage.url}</p>
            </div>

            {/* View Type Switcher */}
            {menuTreeState.length > 0 && (
              <div className="bg-slate-950 p-1 rounded-xl flex border border-slate-800">
                <button 
                  type="button"
                  onClick={() => setViewType('tree')}
                  className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${viewType === 'tree' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-250'}`}
                >
                  <Network size={12} />
                  Sơ đồ Menu ({menuTreeState.length})
                </button>
                <button 
                  type="button"
                  onClick={() => setViewType('flat')}
                  className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${viewType === 'flat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-250'}`}
                >
                  <Layers size={12} />
                  Nhánh phẳng ({subPages.length})
                </button>
              </div>
            )}

            {/* Tree Navigation view */}
            {viewType === 'tree' && menuTreeState.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CẤU TRÚC RẼ NHÁNH FLYOUT</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleTreeSelectAllStatus(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Bật tất cả
                    </button>
                    <span className="text-slate-700">|</span>
                    <button 
                      onClick={() => handleTreeSelectAllStatus(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-300 hover:underline"
                    >
                      Tắt hết
                    </button>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/60 max-h-60 overflow-y-auto rounded-xl p-2 border border-slate-800/80 custom-scrollbar">
                  {menuTreeState.map((node, index) => (
                    <WikiTreeNodeView 
                      key={`${node.title}-${index}`}
                      node={node}
                      onToggleSelect={handleTreeToggleSelect}
                      onToggleExpand={handleTreeToggleExpand}
                      depth={0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Flat list fallback view */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">LIÊN KẾT PHẲNG ({subPages.length})</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleFlatSelectAll(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Chọn hết
                    </button>
                    <span className="text-slate-700">|</span>
                    <button 
                      onClick={() => handleFlatSelectAll(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-300 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {subPages.length === 0 ? (
                  <div className="text-center py-4 bg-slate-950/30 rounded-lg text-xs text-slate-500">
                    Không tìm thấy bài liên kết phụ nào.
                  </div>
                ) : (
                  <div className="space-y-1 bg-slate-950/60 max-h-60 overflow-y-auto rounded-xl p-2 border border-slate-800/80 custom-scrollbar">
                    {subPages.map((page, index) => (
                      <label 
                        key={index}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-slate-800/50 rounded-md cursor-pointer text-[11px] text-slate-300 truncate"
                      >
                        <input 
                          type="checkbox"
                          checked={page.selected}
                          onChange={() => {
                            setSubPages(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <BookOpen size={11} className="text-emerald-500 shrink-0" />
                        <span className="truncate" title={page.title}>{page.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Count tracker */}
            <div className="bg-indigo-950/15 border border-indigo-500/20 rounded-xl p-2 text-center text-xs text-slate-400 font-medium">
              Định vị thu hoạch: <span className="font-bold text-indigo-400 font-mono text-xs">{selectedCountNum}</span> chuyên mục bối cảnh.
              {selectedCountNum > 40 && (
                <p className="text-[10px] text-indigo-400 mt-1 font-sans italic">
                  * Hệ thống đã tối ưu tải song song đa luồng. Có thể gom sạch bách bài viết cực nhanh!
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button 
                onClick={handleStartCrawling}
                variant="primary"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold py-2 border-none rounded-xl hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                <Layers size={14} />
                Bốc dỡ & Gom dữ liệu ({selectedCountNum})
              </Button>
              
              <button 
                onClick={handleReset}
                className="w-full border border-slate-700 text-xs text-slate-400 font-semibold py-1.5 rounded-xl hover:bg-slate-800 hover:text-slate-300 transition-colors"
              >
                Trở lại tìm kiếm
              </button>
            </div>
          </div>
        )}

        {step === 'crawling' && (
          <div className="space-y-4 font-sans animate-in fade-in duration-200">
            <div className="text-center py-4 space-y-2">
              <Loader2 className="animate-spin text-purple-400 h-8 w-8 mx-auto" />
              <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">Đang thu thập dữ liệu...</h4>
              <p className="text-[10px] text-slate-400">
                Quét sâu đa tầng • {crawlTasks.filter(t => t.status === 'success').length} thành công / {crawlTasks.filter(t => t.status === 'failed').length} lỗi / {crawlTasks.length} tổng
              </p>
              {crawlTasks.filter(t => t.status === 'failed').length > 0 && crawlTasks.some(t => t.status === 'idle') && (
                <p className="text-[9px] text-amber-400 font-mono animate-pulse">
                  ↻ Đang tự động retry các trang bị lỗi...
                </p>
              )}
            </div>

            {/* Progress of sub pages */}
            <div className="space-y-1.5 bg-slate-950/50 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">TIẾN ĐỘ TẢI VỀ</span>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {crawlTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-900 last:border-0">
                    <span className="text-slate-300 truncate max-w-[150px] font-sans" title={task.title}>{task.title}</span>
                    <div className="flex items-center gap-1.5">
                      {task.status === 'idle' && <span className="text-slate-600 text-[10px]">Chờ tải</span>}
                      {task.status === 'fetching' && (
                        <span className="text-indigo-400 text-[10px] flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" />
                          Đang tải...
                        </span>
                      )}
                      {task.status === 'success' && <span className="text-green-450 text-[10px] font-bold text-green-400">Đã xong ✓</span>}
                      {task.status === 'failed' && <span className="text-red-400 text-[10px]">Lỗi ✗</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'completed' && aggregateResult && mainPage && (() => {
          const successCount = crawlTasks.filter(t => t.status === 'success').length;
          const failedCount = crawlTasks.filter(t => t.status === 'failed').length;
          const totalCrawled = successCount + 1; // +1 cho trang chính
          const hasFailures = failedCount > 0;
          
          return (
          <div className="space-y-4 font-sans animate-in fade-in duration-200">
            <div className={`text-center p-3 py-4 rounded-xl border space-y-2 ${hasFailures ? 'bg-amber-950/20 border-amber-500/20' : 'bg-green-950/20 border-green-500/20'}`}>
              <CheckCircle2 className={`h-8 w-8 mx-auto ${hasFailures ? 'text-amber-400' : 'text-green-400'}`} strokeWidth={2.5} />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {hasFailures ? 'Thu hoạch hoàn tất (có trang lỗi)' : 'Tìm kiếm & Thu hoạch thành công!'}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Đã gộp thành công bối cảnh của {totalCrawled} chuyên mục rẽ nhánh.
                  {hasFailures && (
                    <span className="text-amber-400 font-semibold"> ({failedCount} trang không thu thập được)</span>
                  )}
                </p>
              </div>
            </div>

            {hasFailures && (
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold text-amber-400 font-mono uppercase block">⚠️ CÁC TRANG BỊ LỖI SAU 3 PASS RETRY</span>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {crawlTasks.filter(t => t.status === 'failed').map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] text-amber-300/80 py-0.5">
                      <X size={10} className="text-red-400 shrink-0" />
                      <span className="truncate" title={task.title}>{task.title}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 italic">
                  Lưu ý: Các trang trên có thể đã bị xóa, chuyển hướng, hoặc server wiki tạm thời chặn truy cập. Dữ liệu đã thu thập thành công vẫn đầy đủ và sẵn sàng sử dụng.
                </p>
              </div>
            )}

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase block text-left">TÀI LIỆU KHOA HỌC THU HOẠCH</span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-sans">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono text-left">Thành công</span>
                  <span className="text-green-400 font-bold text-sm block text-left">
                    {totalCrawled}
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono text-left">Thất bại</span>
                  <span className={`font-bold text-sm block text-left ${failedCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                    {failedCount}
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-mono text-left">Kích cỡ</span>
                  <span className="text-slate-200 font-bold text-sm block text-left">
                    {(aggregateResult.totalLength / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleFeedToTawa}
                disabled={isChatLoading}
                variant="primary"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-xs font-bold py-2.5 border-none rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/20 animate-pulse"
              >
                <Sparkles size={14} />
                Nạp dữ liệu vào Tawa Worldbuilder ({totalCrawled} trang)
              </Button>

              <button 
                onClick={handleReset}
                className="w-full border border-slate-700 text-xs text-slate-400 font-semibold py-1.5 rounded-xl hover:bg-slate-800 hover:text-slate-300 transition-colors"
              >
                Thiết lập liên kết mới
              </button>
            </div>
          </div>
          );
        })()}

      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/30 border-t border-slate-800 shrink-0 text-[10px] text-slate-500 text-center font-mono select-none">
        Bảo mật CORS • Quét sâu Local Header & Content Lists
      </div>

    </div>
  );
};
