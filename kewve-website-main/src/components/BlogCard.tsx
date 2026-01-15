import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { josefinRegular, josefinSemiBold, getRandomColor } from '@/utils';
import { BlogPostDocumentData } from '../../prismicio-types';

interface BlogCardProps {
  uuid: string;
  post: BlogPostDocumentData;
  gridView?: boolean;
}

function BlogCard({ uuid, post, gridView = false }: BlogCardProps) {
  const color = getRandomColor();

  return (
    <div
      className={`relative max-w-full flex-shrink-0 cursor-grab ${gridView ? 'w-full' : 'w-[333px] lg:w-[450px]'}`}
      key={uuid}>
      <div
        aria-hidden='true'
        className='user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]'></div>
      <Image
        src={post.banner?.url ?? ''}
        height={post.banner.dimensions?.height}
        width={post.banner.dimensions?.width}
        alt={post.banner?.alt ?? `${post.title} - banner`}
        className='h-[450px] w-full aspect-square object-cover object-center rounded-xl'
      />
      <div className='absolute top-0 h-full w-full z-10 p-4 bg-black bg-opacity-35 flex flex-col justify-end rounded-xl'>
        <h4
          className={`${josefinSemiBold.className} text-xl lg:text-2xl text-white tracking-wide capitalize mb-2 leading-relaxed`}>
          {post.title}
        </h4>
        <h6 className={`${josefinRegular.className} text-base lg:text-lg text-white mb-4 `}>
          A post by {/*@ts-ignore */}
          {post.author.data.name}
        </h6>
        <Link
          prefetch
          href={`/blog/${uuid}`}
          className={`w-fit rounded-full py-3 px-10 text-lg text-black tracking-wide ${josefinSemiBold.className}`}
          style={{ backgroundColor: color }}>
          Read More
        </Link>
      </div>
    </div>
  );
}

export default BlogCard;
