import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export async function markdownToHtml(md: string): Promise<string> {
  if (!md) return '';
  const result = await remark().use(remarkGfm).use(remarkHtml).process(md);
  return result.toString();
}
