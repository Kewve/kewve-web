import { createClient } from '@/prismicio';
import OurStoryContainer from '@/containers/our-story';

export default async function OurStory() {
  try {
    const client = createClient();
    const ourStoryContent = await client.getByType('our_story_page', { fetchOptions: { next: { revalidate: 10 } } });
    const content = ourStoryContent?.results?.[0]?.data ?? null;
    return <OurStoryContainer content={content} />;
  } catch (error) {
    console.error('Failed to load our story content:', error);
    return <OurStoryContainer content={null} />;
  }
}
