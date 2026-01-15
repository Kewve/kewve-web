import { createClient } from '@/prismicio';
import OurStoryContainer from '@/containers/our-story';

export default async function OurStory() {
  const client = createClient();

  const ourStoryContent = await client.getByType('our_story_page', { fetchOptions: { next: { revalidate: 10 } } });

  return <OurStoryContainer content={ourStoryContent.results[0].data} />;
}
