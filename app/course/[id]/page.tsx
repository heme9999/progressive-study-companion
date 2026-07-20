export const dynamicParams = false;
import { defaultBooks } from "../../data/defaultBooks";
import CourseClientPage from "./CourseClientPage";
import { Metadata } from "next";

// 预渲染：在构建时生成真实的 HTML 文件
export async function generateStaticParams() {
  // 返回所有默认书籍的 ID，Next.js 会在 build 期间预先渲染这些路径
  return defaultBooks.map((book) => ({
    id: book.id,
  }));
}

// 动态生成每个课程的 SEO Meta 标签
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = defaultBooks.find((b) => b.id === id);
  
  if (!book) {
    return {
      title: "课程未找到 - LibreStep",
    };
  }

  return {
    title: `${book.title} - LibreStep 智能学习`,
    description: book.description,
    openGraph: {
      title: `${book.title} - LibreStep`,
      description: book.description,
    }
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseClientPage id={id} />;
}
